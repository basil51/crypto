import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('ALCHEMY_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn('ALCHEMY_API_KEY not configured');
    }

    // Alchemy uses different base URLs for different networks
    // Default to Ethereum mainnet
    const network = this.configService.get<string>('ALCHEMY_NETWORK') || 'eth-mainnet';
    this.baseURL = `https://${network}.g.alchemy.com/v2`;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

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

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new HttpException(
        'Alchemy API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const startTime = Date.now();
    try {
      const response = await this.retryRequest(async () => {
        const url = `${this.baseURL}/${this.apiKey}${endpoint}`;
        if (method === 'GET') {
          return await axios.get(url, { params: data });
        } else {
          return await axios.post(url, data);
        }
      });

      const duration = Date.now() - startTime;
      const costEstimate = this.estimateCost(endpoint, method);
      
      await this.logApiUsage('alchemy', endpoint, costEstimate);

      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Alchemy API error: ${endpoint} - ${error.message}`,
        error.stack,
      );

      await this.logApiUsage('alchemy', endpoint, 0);

      if (error.response) {
        throw new HttpException(
          `Alchemy API error: ${error.response.data?.error?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Alchemy API error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimate cost based on endpoint and method
   * Alchemy pricing (approximate):
   * - Basic API calls: $0.0001 - $0.001 per request
   * - Asset transfers: $0.0005 per request
   * - Token balances: $0.0003 per request
   * - Block data: $0.0002 per request
   */
  private estimateCost(endpoint: string, method: string): number {
    // Base cost
    let cost = 0.0001;

    // Endpoint-specific costs
    if (endpoint.includes('/transfers') || endpoint.includes('/getAssetTransfers')) {
      cost = 0.0005; // Asset transfers are more expensive
    } else if (endpoint.includes('/balance') || endpoint.includes('/getTokenBalances')) {
      cost = 0.0003; // Balance queries
    } else if (endpoint.includes('/block') || endpoint.includes('/getBlock')) {
      cost = 0.0002; // Block data
    } else if (endpoint.includes('/metadata') || endpoint.includes('/getTokenMetadata')) {
      cost = 0.0001; // Metadata is cheaper
    }

    // POST requests might be more expensive
    if (method === 'POST') {
      cost *= 1.5;
    }

    return parseFloat(cost.toFixed(6));
  }

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
      return null;
    }
  }

  /**
   * Get asset transfers for a token contract
   */
  async getAssetTransfers(params: {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    contractAddresses?: string[];
    category?: string[];
    maxCount?: number;
    pageKey?: string;
  }): Promise<any> {
    return this.makeRequest('POST', '', {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [params],
    });
  }

  /**
   * Get token balances for an address
   */
  async getTokenBalances(
    address: string,
    contractAddresses?: string[],
  ): Promise<any> {
    const params: any = {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getTokenBalances',
      params: [address],
    };

    if (contractAddresses && contractAddresses.length > 0) {
      params.params.push(contractAddresses);
    }

    return this.makeRequest('POST', '', params);
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(contractAddress: string): Promise<any> {
    return this.makeRequest('POST', '', {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getTokenMetadata',
      params: [contractAddress],
    });
  }

  /**
   * Get the latest block number
   */
  async getLatestBlock(): Promise<any> {
    return this.makeRequest('POST', '', {
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
    });
  }
}

