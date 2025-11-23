import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { TokensService } from '../../tokens/tokens.service';
import { WalletsService } from '../../wallets/wallets.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private integrationsService: IntegrationsService,
    private transactionsService: TransactionsService,
    private tokensService: TokensService,
    private walletsService: WalletsService,
  ) {}

  /**
   * Ingest transactions for tracked tokens
   */
  async ingestTransactions(): Promise<void> {
    this.logger.log('Starting transaction ingestion...');

    try {
      // Get all active tracked tokens
      const tokens = await this.tokensService.findAll({ active: true });
      
      if (tokens.length === 0) {
        this.logger.warn('No active tokens to ingest');
        return;
      }

      this.logger.log(`Processing ${tokens.length} active tokens`);

      // Process each token
      for (const token of tokens) {
        try {
          await this.ingestTokenTransactions(token.id, token.chain, token.contractAddress);
        } catch (error) {
          this.logger.error(
            `Failed to ingest transactions for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log('Transaction ingestion completed');
    } catch (error) {
      this.logger.error(`Transaction ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest transactions for a specific token
   */
  private async ingestTokenTransactions(
    tokenId: string,
    chain: string,
    contractAddress: string,
  ): Promise<void> {
    this.logger.debug(`Ingesting transactions for token ${tokenId} on ${chain}`);

    try {
      // Skip native tokens (zero address) - they need different API endpoints
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (contractAddress.toLowerCase() === zeroAddress.toLowerCase()) {
        this.logger.debug(`Skipping native token ${tokenId} (zero address). Native tokens require different endpoints.`);
        return;
      }

      // Validate contract address format
      if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
        this.logger.warn(`Invalid contract address for token ${tokenId}: ${contractAddress}`);
        return;
      }

      // Get the latest block we've processed for this token
      const latestTransaction = await this.prisma.transaction.findFirst({
        where: { tokenId },
        orderBy: { blockNumber: 'desc' },
        select: { blockNumber: true },
      });

      const fromBlock = latestTransaction
        ? Number(latestTransaction.blockNumber) + 1
        : undefined;

      // Try Moralis first, fallback to Alchemy
      let transfers: any[] = [];
      const providers = this.integrationsService.getAvailableProviders();

      if (providers.moralis) {
        try {
          transfers = await this.fetchFromMoralis(contractAddress, chain, fromBlock);
        } catch (error: any) {
          // Check if it's a 400 error (bad request) - likely invalid address or block range
          const statusCode = error?.status || error?.response?.status;
          if (statusCode === 400) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Bad request';
            this.logger.warn(`Moralis rejected request for token ${tokenId}: ${errorMessage}`);
            // Don't try Alchemy if it's a bad request - same issue will occur
            return;
          }
          this.logger.warn(`Moralis failed, trying Alchemy: ${error.message}`);
          if (providers.alchemy) {
            try {
              transfers = await this.fetchFromAlchemy(contractAddress, chain, fromBlock);
            } catch (alchemyError: any) {
              const alchemyStatusCode = alchemyError?.status || alchemyError?.response?.status;
              if (alchemyStatusCode === 400) {
                this.logger.warn(`Alchemy also rejected request for token ${tokenId}: Invalid contract address or parameters`);
                return;
              }
              throw alchemyError;
            }
          }
        }
      } else if (providers.alchemy) {
        try {
          transfers = await this.fetchFromAlchemy(contractAddress, chain, fromBlock);
        } catch (error: any) {
          const statusCode = error?.status || error?.response?.status;
          if (statusCode === 400) {
            this.logger.warn(`Alchemy rejected request for token ${tokenId}: Invalid contract address or parameters`);
            return;
          }
          throw error;
        }
      } else {
        this.logger.warn('No API providers configured');
        return;
      }

      if (transfers.length === 0) {
        this.logger.debug(`No new transactions found for token ${tokenId}`);
        return;
      }

      // Process and store transactions
      await this.processAndStoreTransactions(transfers, tokenId, chain);

      this.logger.log(
        `Ingested ${transfers.length} transactions for token ${tokenId}`,
      );
    } catch (error: any) {
      // Check if it's an authentication/authorization error (403, 401)
      const statusCode = error?.status || error?.response?.status;
      const isAuthError = statusCode === 403 || statusCode === 401;
      
      if (isAuthError) {
        // Log auth errors as warnings - these are expected when API keys aren't configured
        this.logger.warn(
          `Skipping ingestion for token ${tokenId}: API authentication failed (${error.message}). ` +
          `Configure ALCHEMY_API_KEY or MORALIS_API_KEY in .env to enable ingestion.`,
        );
        // Don't throw - gracefully skip this token
        return;
      }
      
      // For other errors, log as error but don't crash the entire job
      this.logger.error(
        `Failed to ingest transactions for token ${tokenId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow other tokens to be processed
    }
  }

  /**
   * Fetch transfers from Moralis
   * Note: Moralis /erc20/{address}/transfers endpoint gets transfers TO/FROM a wallet address
   * For token contract monitoring, we need to get transfers where the token contract is involved
   */
  private async fetchFromMoralis(
    contractAddress: string,
    chain: string,
    fromBlock?: number,
  ): Promise<any[]> {
    const moralisChain = this.mapChainToMoralis(chain);
    
    try {
      // Get transfers involving this token contract
      // Note: This endpoint gets transfers TO/FROM the address, so we're getting
      // transfers where this contract address is the token being transferred
      const transfers = await this.integrationsService.moralis.getTokenTransfers(
        contractAddress,
        moralisChain,
        fromBlock,
        undefined, // Don't pass 'latest' - let Moralis handle it automatically
        100,
      );

      // Normalize and return
      return this.normalizeMoralisTransfers(transfers.result || []);
    } catch (error: any) {
      // Re-throw with more context
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      if (errorMessage.includes('to_block') || errorMessage.includes('from_block')) {
        throw new Error(`Block range error: ${errorMessage}. This usually means fromBlock is greater than current block.`);
      }
      throw error;
    }
  }

  /**
   * Fetch transfers from Alchemy
   */
  private async fetchFromAlchemy(
    contractAddress: string,
    chain: string,
    fromBlock?: number,
  ): Promise<any[]> {
    const params: any = {
      contractAddresses: [contractAddress],
      category: ['erc20'],
      maxCount: 100,
    };

    if (fromBlock) {
      params.fromBlock = `0x${fromBlock.toString(16)}`;
    }

    const response = await this.integrationsService.alchemy.getAssetTransfers(params);

    if (response?.result?.transfers) {
      return this.normalizeAlchemyTransfers(response.result.transfers);
    }

    return [];
  }

  /**
   * Normalize Moralis transfer format to our schema
   */
  private normalizeMoralisTransfers(transfers: any[]): any[] {
    return transfers.map((transfer) => ({
      txHash: transfer.transaction_hash,
      fromAddress: transfer.from_address,
      toAddress: transfer.to_address,
      amount: transfer.value || '0',
      blockNumber: transfer.block_number?.toString() || '0',
      timestamp: transfer.block_timestamp
        ? new Date(transfer.block_timestamp)
        : new Date(),
      raw: transfer,
    }));
  }

  /**
   * Normalize Alchemy transfer format to our schema
   */
  private normalizeAlchemyTransfers(transfers: any[]): any[] {
    return transfers.map((transfer) => ({
      txHash: transfer.hash,
      fromAddress: transfer.from,
      toAddress: transfer.to,
      amount: transfer.value || '0',
      blockNumber: transfer.blockNum ? parseInt(transfer.blockNum, 16).toString() : '0',
      timestamp: transfer.metadata?.blockTimestamp
        ? new Date(transfer.metadata.blockTimestamp)
        : new Date(),
      raw: transfer,
    }));
  }

  /**
   * Process and store transactions
   */
  private async processAndStoreTransactions(
    transfers: any[],
    tokenId: string,
    chain: string,
  ): Promise<void> {
    // Ensure wallets exist
    const walletAddresses = new Set<string>();
    transfers.forEach((t) => {
      if (t.fromAddress) walletAddresses.add(t.fromAddress);
      if (t.toAddress) walletAddresses.add(t.toAddress);
    });

    // Create or update wallets
    for (const address of walletAddresses) {
      try {
        const existing = await this.walletsService.findByAddress(address);
        if (!existing) {
          await this.walletsService.create({
            address,
            tracked: false, // Can be set to true later
          });
        }
      } catch (error) {
        // Wallet might already exist, continue
        this.logger.debug(`Wallet ${address} already exists or error: ${error.message}`);
      }
    }

    // Prepare transaction data
    const transactionData = transfers.map((transfer) => ({
      txHash: transfer.txHash,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenId,
      amount: transfer.amount.toString(),
      blockNumber: BigInt(transfer.blockNumber),
      timestamp: transfer.timestamp,
      raw: transfer.raw || {},
    }));

    // Store transactions (skip duplicates)
    try {
      await this.transactionsService.createMany(transactionData);
    } catch (error: any) {
      // If bulk insert fails, try individual inserts
      if (error.code === 'P2002' || error.message?.includes('unique')) {
        this.logger.debug('Some transactions already exist, skipping duplicates');
        // Try inserting individually
        for (const data of transactionData) {
          try {
            await this.transactionsService.create({
              txHash: data.txHash,
              fromAddress: data.fromAddress,
              toAddress: data.toAddress,
              amount: data.amount,
              blockNumber: data.blockNumber,
              timestamp: data.timestamp,
              raw: data.raw,
              token: { connect: { id: tokenId } },
            } as any);
          } catch (err: any) {
            // Skip if duplicate
            if (err.code !== 'P2002') {
              this.logger.warn(`Failed to insert transaction ${data.txHash}: ${err.message}`);
            }
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Map chain name to Moralis format
   */
  private mapChainToMoralis(chain: string): string {
    const mapping: Record<string, string> = {
      ethereum: 'eth',
      'binance-smart-chain': 'bsc',
      polygon: 'matic',
      avalanche: 'avalanche',
      fantom: 'fantom',
    };
    return mapping[chain.toLowerCase()] || chain.toLowerCase();
  }
}

