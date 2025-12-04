import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

interface QuickNodeRPCRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any[];
}

interface QuickNodeRPCResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  transaction: {
    message: {
      accountKeys: string[];
      instructions: Array<{
        programId: string;
        accounts?: string[];
        data?: string;
      }>;
    };
    signatures: string[];
  };
  meta: {
    err: any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions?: Array<{
      index: number;
      instructions: Array<{
        programId: string;
        accounts?: string[];
        data?: string;
      }>;
    }>;
    logMessages?: string[];
    preTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner: string;
      programId: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
        uiAmountString: string;
      };
    }>;
    postTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner: string;
      programId: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
        uiAmountString: string;
      };
    }>;
  };
}

interface SolanaTokenTransfer {
  signature: string;
  slot: number;
  blockTime: number;
  fromAddress: string;
  toAddress: string;
  mint: string; // Token mint address
  amount: string;
  decimals: number;
  uiAmount: number | null;
}

@Injectable()
export class QuickNodeService {
  private readonly logger = new Logger(QuickNodeService.name);
  private readonly apiUrl: string;
  private readonly client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private requestId = 0;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiUrl = this.configService.get<string>('QUICKNODE_API_URL') || '';

    if (!this.apiUrl) {
      this.logger.warn('QUICKNODE_API_URL not configured. QuickNode features will be disabled.');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Check if QuickNode is available
   */
  isAvailable(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (retries > 0 && this.isRetryableError(error)) {
        this.logger.warn(`Retrying request... ${retries} attempts left`);
        await this.delay(this.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // Server error or rate limit
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make an RPC request to QuickNode
   */
  private async rpcRequest<T>(
    method: string,
    params?: any[],
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new HttpException(
        'QuickNode API URL not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const requestId = ++this.requestId;
    const request: QuickNodeRPCRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    const startTime = Date.now();
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post<QuickNodeRPCResponse<T>>('', request);
      });

      const duration = Date.now() - startTime;
      const costEstimate = this.estimateCost(method);

      await this.logApiUsage('quicknode', method, costEstimate);

      if (response.data.error) {
        throw new Error(
          `QuickNode RPC error: ${response.data.error.message} (code: ${response.data.error.code})`,
        );
      }

      if (!response.data.result) {
        throw new Error('QuickNode RPC returned no result');
      }

      return response.data.result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `QuickNode RPC error: ${method} - ${error.message}`,
        error.stack,
      );

      await this.logApiUsage('quicknode', method, 0);

      if (error.response) {
        throw new HttpException(
          `QuickNode RPC error: ${error.response.data?.error?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `QuickNode RPC error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimate cost based on RPC method
   * QuickNode pricing (approximate):
   * - Basic RPC calls: $0.0001 - $0.001 per request
   * - getSignaturesForAddress: $0.0005 per request
   * - getTransaction: $0.0003 per request
   * - getProgramAccounts: $0.001 per request
   */
  private estimateCost(method: string): number {
    let cost = 0.0001; // Base cost

    if (method.includes('getSignaturesForAddress')) {
      cost = 0.0005;
    } else if (method.includes('getTransaction')) {
      cost = 0.0003;
    } else if (method.includes('getProgramAccounts')) {
      cost = 0.001;
    } else if (method.includes('getSlot') || method.includes('getBlockHeight')) {
      cost = 0.0001; // Simple queries
    }

    return parseFloat(cost.toFixed(6));
  }

  /**
   * Log API usage to database
   */
  private async logApiUsage(provider: string, endpoint: string, costEstimate?: number) {
    try {
      return await this.prisma.apiUsageLog.create({
        data: {
          provider,
          endpoint,
          costEstimate: costEstimate ? costEstimate : null,
        },
      });
    } catch (error) {
      // Don't fail the main request if logging fails
      this.logger.debug('Failed to log API usage:', error);
    }
  }

  /**
   * Get current slot number
   */
  async getCurrentSlot(): Promise<number> {
    return await this.rpcRequest<number>('getSlot');
  }

  /**
   * Get block height
   */
  async getBlockHeight(): Promise<number> {
    return await this.rpcRequest<number>('getBlockHeight');
  }

  /**
   * Get transaction signatures for an address
   * This is useful for tracking wallet activity
   */
  async getSignaturesForAddress(
    address: string,
    limit: number = 100,
    before?: string,
    until?: string,
  ): Promise<Array<{
    signature: string;
    slot: number;
    err: any;
    memo?: string;
    blockTime: number | null;
  }>> {
    const params: any[] = [address, { limit }];
    if (before) params[1].before = before;
    if (until) params[1].until = until;

    return await this.rpcRequest<Array<{
      signature: string;
      slot: number;
      err: any;
      memo?: string;
      blockTime: number | null;
    }>>('getSignaturesForAddress', params);
  }

  /**
   * Get transaction details
   */
  async getTransaction(
    signature: string,
    commitment: 'finalized' | 'confirmed' | 'processed' = 'confirmed',
  ): Promise<SolanaTransaction | null> {
    const result = await this.rpcRequest<SolanaTransaction | null>(
      'getTransaction',
      [
        signature,
        {
          encoding: 'jsonParsed',
          maxSupportedTransactionVersion: 0,
          commitment,
        },
      ],
    );
    return result;
  }

  /**
   * Get token transfers for a token mint address
   * This extracts token transfers from transaction data
   */
  async getTokenTransfers(
    mintAddress: string,
    limit: number = 100,
    fromSlot?: number,
  ): Promise<SolanaTokenTransfer[]> {
    try {
      // Get program accounts for the token mint
      // This finds all token accounts for this mint
      const programAccounts = await this.rpcRequest<Array<{
        account: {
          data: {
            parsed: {
              info: {
                mint: string;
                owner: string;
                tokenAmount: {
                  amount: string;
                  decimals: number;
                  uiAmount: number | null;
                };
              };
            };
          };
        };
        pubkey: string;
      }>>('getProgramAccounts', [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program
        {
          filters: [
            {
              dataSize: 165, // Token account size
            },
            {
              memcmp: {
                offset: 0,
                bytes: mintAddress,
              },
            },
          ],
        },
      ]);

      // For now, return empty array - full implementation would track transfers
      // This is a simplified version - in production, you'd need to:
      // 1. Track token account changes
      // 2. Monitor transaction signatures for these accounts
      // 3. Extract transfer instructions
      
      this.logger.debug(`Found ${programAccounts.length} token accounts for mint ${mintAddress}`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to get token transfers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent transactions for a token mint
   * This is a simplified approach - gets transactions involving the token program
   */
  async getRecentTokenTransactions(
    mintAddress: string,
    limit: number = 100,
  ): Promise<SolanaTokenTransfer[]> {
    try {
      // Get signatures for the token mint address (if it's a program-derived address)
      // This is a simplified approach - in production, you'd query by program accounts
      const signatures = await this.getSignaturesForAddress(mintAddress, limit);

      const transfers: SolanaTokenTransfer[] = [];

      // Fetch transaction details for each signature
      for (const sigInfo of signatures.slice(0, Math.min(limit, 50))) {
        try {
          const tx = await this.getTransaction(sigInfo.signature);
          if (!tx || tx.meta?.err) {
            continue; // Skip failed transactions
          }

          // Extract token transfers from transaction
          const tokenTransfers = this.extractTokenTransfers(tx, mintAddress);
          transfers.push(...tokenTransfers);
        } catch (error) {
          this.logger.debug(`Failed to get transaction ${sigInfo.signature}: ${error.message}`);
          continue;
        }
      }

      return transfers;
    } catch (error) {
      this.logger.error(`Failed to get recent token transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract token transfers from a Solana transaction
   */
  private extractTokenTransfers(
    transaction: SolanaTransaction,
    mintAddress: string,
  ): SolanaTokenTransfer[] {
    const transfers: SolanaTokenTransfer[] = [];

    if (!transaction.meta?.preTokenBalances || !transaction.meta?.postTokenBalances) {
      return transfers;
    }

    // Compare pre and post token balances to find transfers
    const preBalances = new Map<string, number>();
    const postBalances = new Map<string, number>();

    transaction.meta.preTokenBalances.forEach((balance) => {
      if (balance.mint === mintAddress) {
        preBalances.set(balance.owner, parseFloat(balance.uiTokenAmount.amount));
      }
    });

    transaction.meta.postTokenBalances.forEach((balance) => {
      if (balance.mint === mintAddress) {
        postBalances.set(balance.owner, parseFloat(balance.uiTokenAmount.amount));
      }
    });

    // Find transfers (balance decreases = sender, increases = receiver)
    for (const [owner, preAmount] of preBalances.entries()) {
      const postAmount = postBalances.get(owner) || 0;
      const diff = postAmount - preAmount;

      if (diff < 0) {
        // This address sent tokens
        const sentAmount = Math.abs(diff);
        // Find who received (balance increased)
        for (const [receiver, receiverPost] of postBalances.entries()) {
          if (receiver !== owner) {
            const receiverPre = preBalances.get(receiver) || 0;
            const receivedAmount = receiverPost - receiverPre;
            if (receivedAmount > 0 && Math.abs(receivedAmount - sentAmount) < 0.01) {
              // Found matching transfer
              transfers.push({
                signature: transaction.signature,
                slot: transaction.slot,
                blockTime: transaction.blockTime || Date.now() / 1000,
                fromAddress: owner,
                toAddress: receiver,
                mint: mintAddress,
                amount: sentAmount.toString(),
                decimals: transaction.meta.postTokenBalances.find((b) => b.mint === mintAddress)?.uiTokenAmount.decimals || 9,
                uiAmount: sentAmount,
              });
            }
          }
        }
      }
    }

    return transfers;
  }

  /**
   * Get account info
   */
  async getAccountInfo(address: string): Promise<{
    data: string | any;
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch?: number;
  } | null> {
    return await this.rpcRequest<{
      data: string | any;
      executable: boolean;
      lamports: number;
      owner: string;
      rentEpoch?: number;
    } | null>('getAccountInfo', [address, { encoding: 'jsonParsed' }]);
  }
}

