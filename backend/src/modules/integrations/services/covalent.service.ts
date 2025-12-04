import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

interface CovalentResponse<T> {
  data: T;
  error: boolean;
  error_message?: string;
  error_code?: number;
}

interface CovalentTransfer {
  tx_hash: string;
  block_signed_at: string;
  block_height: number;
  from_address: string;
  to_address: string;
  value: string;
  value_quote?: number;
  gas_offered: number;
  gas_spent: number;
  gas_price: number;
  gas_quote?: number;
  log_events: Array<{
    decoded?: {
      name: string;
      params: Array<{
        name: string;
        value: string;
      }>;
    };
    sender_address: string;
    sender_contract_decimals?: number;
    sender_contract_ticker_symbol?: string;
    sender_contract_address?: string;
  }>;
  transfers: Array<{
    contract_address: string;
    contract_name?: string;
    contract_ticker_symbol?: string;
    contract_decimals?: number;
    from_address: string;
    to_address: string;
    value: string;
    value_quote?: number;
  }>;
}

interface LargeTransfer {
  transaction: {
    hash: string;
    block: {
      timestamp: { time: string };
      number: number;
    };
  };
  amount: number;
  currency: {
    address: string;
    symbol: string;
    name: string;
  };
  receiver: {
    address: string;
  };
  sender: {
    address: string;
  };
}

interface WalletFlow {
  address: string;
  in: number;
  out: number;
  net: number;
  token: {
    symbol: string;
    address: string;
  };
}

/**
 * Chain ID mapping for Covalent API
 */
const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  base: 8453,
  arbitrum: 42161,
  avalanche: 43114,
};

/**
 * Reverse mapping: chain ID to chain name
 */
const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum',
  43114: 'avalanche',
};

@Injectable()
export class CovalentService {
  private readonly logger = new Logger(CovalentService.name);
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.covalenthq.com/v1';
  private readonly client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('COVALENT_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('COVALENT_API_KEY not configured. Covalent features will be disabled.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });
  }

  /**
   * Check if Covalent is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
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
   * Make a request to Covalent API
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new HttpException(
        'Covalent API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const startTime = Date.now();
    try {
      // Add API key to params (Covalent uses 'key' query parameter)
      const paramsWithKey = {
        ...params,
        key: this.apiKey,
      };
      
      const response = await this.retryRequest(async () => {
        return await this.client.get<CovalentResponse<T>>(endpoint, { params: paramsWithKey });
      });

      const duration = Date.now() - startTime;
      const costEstimate = this.estimateCost(endpoint);

      await this.logApiUsage('covalent', endpoint, costEstimate);

      if (response.data.error) {
        throw new Error(
          response.data.error_message || `Covalent API error: ${response.data.error_code}`,
        );
      }

      return response.data.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Covalent API error: ${endpoint} - ${error.message}`,
        error.stack,
      );

      await this.logApiUsage('covalent', endpoint, 0);

      if (error.response) {
        throw new HttpException(
          `Covalent API error: ${error.response.data?.error_message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Covalent API error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimate cost based on endpoint
   * Covalent pricing (approximate):
   * - Free tier: 100,000 credits/month
   * - Transfers endpoint: ~100 credits per request
   * - Transactions endpoint: ~200 credits per request
   * - Estimated cost: $0.0001 - $0.001 per request (depending on tier)
   */
  private estimateCost(endpoint: string): number {
    let cost = 0.0001; // Base cost

    if (endpoint.includes('/transactions')) {
      cost = 0.0005; // Transactions are more expensive
    } else if (endpoint.includes('/transfers')) {
      cost = 0.0003; // Transfers
    } else if (endpoint.includes('/events')) {
      cost = 0.0004; // Events
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
   * Get chain ID from chain name
   */
  private getChainId(chain: string): number | null {
    return CHAIN_ID_MAP[chain.toLowerCase()] || null;
  }

  /**
   * Get chain name from chain ID
   */
  private getChainName(chainId: number): string {
    return CHAIN_ID_TO_NAME[chainId] || `chain-${chainId}`;
  }

  /**
   * Get large transfers for a token (whale tracking)
   */
  async getLargeTransfers(
    tokenAddress: string,
    chain: string = 'ethereum',
    minAmountUSD: number = 100000, // $100k USD minimum
    limit: number = 100,
    fromTime?: string,
  ): Promise<LargeTransfer[]> {
    const chainId = this.getChainId(chain);
    if (!chainId) {
      this.logger.error(`Unsupported chain: ${chain}`);
      return [];
    }

    try {
      // Covalent doesn't have a direct "large transfers" endpoint
      // We'll use the transfers endpoint and filter by value_quote
      const endpoint = `/${chainId}/tokens/${tokenAddress}/transfers_v2/`;
      
      const params: Record<string, any> = {
        'page-size': Math.min(limit, 1000), // Covalent max is 1000
      };

      if (fromTime) {
        params['block-signed-at'] = fromTime;
      }

      const response = await this.makeRequest<{
        items: CovalentTransfer[];
        pagination: {
          page_number: number;
          page_size: number;
          has_more: boolean;
        };
      }>(endpoint, params);

      // Filter by minimum USD value and transform to LargeTransfer format
      const largeTransfers: LargeTransfer[] = [];

      for (const item of response.items || []) {
        for (const transfer of item.transfers || []) {
          // Check if this is the token we're looking for
          if (transfer.contract_address.toLowerCase() !== tokenAddress.toLowerCase()) {
            continue;
          }

          const valueQuote = transfer.value_quote || 0;
          if (valueQuote >= minAmountUSD) {
            largeTransfers.push({
              transaction: {
                hash: item.tx_hash,
                block: {
                  timestamp: { time: item.block_signed_at },
                  number: item.block_height,
                },
              },
              amount: parseFloat(transfer.value) / Math.pow(10, transfer.contract_decimals || 18),
              currency: {
                address: transfer.contract_address,
                symbol: transfer.contract_ticker_symbol || 'UNKNOWN',
                name: transfer.contract_name || transfer.contract_ticker_symbol || 'Unknown Token',
              },
              receiver: {
                address: transfer.to_address,
              },
              sender: {
                address: transfer.from_address,
              },
            });
          }
        }
      }

      // Sort by timestamp descending and limit
      largeTransfers.sort((a, b) => 
        new Date(b.transaction.block.timestamp.time).getTime() - 
        new Date(a.transaction.block.timestamp.time).getTime()
      );

      return largeTransfers.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to fetch large transfers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all large transfers across ALL tokens (broad monitoring)
   * This method fetches large transfers without filtering by token address
   */
  async getAllLargeTransfers(
    chain: string = 'ethereum',
    minAmountUSD: number = 100000, // $100k USD minimum
    limit: number = 100,
    fromTime?: string,
  ): Promise<LargeTransfer[]> {
    const chainId = this.getChainId(chain);
    if (!chainId) {
      this.logger.error(`Unsupported chain: ${chain}`);
      return [];
    }

    try {
      // Covalent doesn't have a direct "all large transfers" endpoint
      // We'll use the transactions endpoint for recent blocks and filter
      // Note: This is a workaround - Covalent's free tier may have limitations
      const endpoint = `/${chainId}/transactions_v2/`;
      
      const params: Record<string, any> = {
        'page-size': Math.min(limit * 10, 1000), // Fetch more to filter
      };

      if (fromTime) {
        params['block-signed-at'] = fromTime;
      }

      const response = await this.makeRequest<{
        items: CovalentTransfer[];
        pagination: {
          page_number: number;
          page_size: number;
          has_more: boolean;
        };
      }>(endpoint, params);

      const largeTransfers: LargeTransfer[] = [];

      for (const item of response.items || []) {
        // Check transfers in the transaction
        for (const transfer of item.transfers || []) {
          const valueQuote = transfer.value_quote || 0;
          if (valueQuote >= minAmountUSD) {
            largeTransfers.push({
              transaction: {
                hash: item.tx_hash,
                block: {
                  timestamp: { time: item.block_signed_at },
                  number: item.block_height,
                },
              },
              amount: parseFloat(transfer.value) / Math.pow(10, transfer.contract_decimals || 18),
              currency: {
                address: transfer.contract_address,
                symbol: transfer.contract_ticker_symbol || 'UNKNOWN',
                name: transfer.contract_name || transfer.contract_ticker_symbol || 'Unknown Token',
              },
              receiver: {
                address: transfer.to_address,
              },
              sender: {
                address: transfer.from_address,
              },
            });
          }
        }

        // Also check native value if significant
        const nativeValueQuote = item.gas_quote || 0;
        if (nativeValueQuote >= minAmountUSD) {
          // This would be a native token transfer (ETH, BNB, etc.)
          // We'll skip this for now as it's not token-specific
        }
      }

      // Sort by timestamp descending and limit
      largeTransfers.sort((a, b) => 
        new Date(b.transaction.block.timestamp.time).getTime() - 
        new Date(a.transaction.block.timestamp.time).getTime()
      );

      this.logger.log(
        `Fetched ${largeTransfers.length} large transfers across all tokens from ${chain}`
      );

      return largeTransfers.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to fetch all large transfers: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze wallet flow for a token (inflow/outflow analysis)
   */
  async getWalletFlow(
    tokenAddress: string,
    chain: string = 'ethereum',
    hours: number = 24,
  ): Promise<WalletFlow[]> {
    const chainId = this.getChainId(chain);
    if (!chainId) {
      this.logger.error(`Unsupported chain: ${chain}`);
      return [];
    }

    try {
      const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const endpoint = `/${chainId}/tokens/${tokenAddress}/transfers_v2/`;
      
      const response = await this.makeRequest<{
        items: CovalentTransfer[];
      }>(endpoint, {
        'block-signed-at': fromTime,
        'page-size': 1000,
      });

      // Aggregate wallet flows
      const flowMap = new Map<string, WalletFlow>();

      for (const item of response.items || []) {
        for (const transfer of item.transfers || []) {
          if (transfer.contract_address.toLowerCase() !== tokenAddress.toLowerCase()) {
            continue;
          }

          const token = {
            symbol: transfer.contract_ticker_symbol || 'UNKNOWN',
            address: transfer.contract_address,
          };

          // Inflow (to address)
          const receiverKey = `${transfer.to_address}-${token.address}`;
          if (!flowMap.has(receiverKey)) {
            flowMap.set(receiverKey, {
              address: transfer.to_address,
              in: 0,
              out: 0,
              net: 0,
              token,
            });
          }
          const receiverFlow = flowMap.get(receiverKey)!;
          const amount = parseFloat(transfer.value) / Math.pow(10, transfer.contract_decimals || 18);
          receiverFlow.in += amount;
          receiverFlow.net += amount;

          // Outflow (from address)
          const senderKey = `${transfer.from_address}-${token.address}`;
          if (!flowMap.has(senderKey)) {
            flowMap.set(senderKey, {
              address: transfer.from_address,
              in: 0,
              out: 0,
              net: 0,
              token,
            });
          }
          const senderFlow = flowMap.get(senderKey)!;
          senderFlow.out += amount;
          senderFlow.net -= amount;
        }
      }

      return Array.from(flowMap.values());
    } catch (error) {
      this.logger.error(`Failed to fetch wallet flow: ${error.message}`);
      return [];
    }
  }

  /**
   * Track whale clusters (wallets buying the same token)
   */
  async getWhaleClusters(
    tokenAddress: string,
    chain: string = 'ethereum',
    minAmountUSD: number = 50000,
    hours: number = 24,
  ): Promise<Array<{ addresses: string[]; totalAmount: number; count: number }>> {
    const transfers = await this.getLargeTransfers(tokenAddress, chain, minAmountUSD, 1000);

    // Group by time window and find clusters
    const clusters = new Map<string, { addresses: Set<string>; totalAmount: number }>();

    transfers.forEach((transfer) => {
      const timeWindow = new Date(transfer.transaction.block.timestamp.time);
      timeWindow.setMinutes(0, 0, 0); // Round to hour
      const key = timeWindow.toISOString();

      if (!clusters.has(key)) {
        clusters.set(key, { addresses: new Set(), totalAmount: 0 });
      }

      const cluster = clusters.get(key)!;
      cluster.addresses.add(transfer.receiver.address);
      cluster.totalAmount += transfer.amount;
    });

    return Array.from(clusters.entries())
      .filter(([, cluster]) => cluster.addresses.size >= 3) // At least 3 addresses
      .map(([, cluster]) => ({
        addresses: Array.from(cluster.addresses),
        totalAmount: cluster.totalAmount,
        count: cluster.addresses.size,
      }));
  }
}

