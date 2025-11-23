import { Injectable, Logger, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MoralisService {
  private readonly logger = new Logger(MoralisService.name);
  private readonly apiKey: string;
  private readonly baseURL = 'https://deep-index.moralis.io/api/v2';
  private readonly client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('MORALIS_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn('MORALIS_API_KEY not configured');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-API-Key': this.apiKey,
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
    params?: any,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new HttpException(
        'Moralis API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const startTime = Date.now();
    try {
      const response = await this.retryRequest(async () => {
        if (method === 'GET') {
          return await this.client.get(endpoint, { params });
        } else {
          return await this.client.post(endpoint, params);
        }
      });

      const duration = Date.now() - startTime;
      const costEstimate = this.estimateCost(endpoint, method);
      
      await this.logApiUsage('moralis', endpoint, costEstimate);

      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Moralis API error: ${endpoint} - ${error.message}`,
        error.stack,
      );

      await this.logApiUsage('moralis', endpoint, 0);

      if (error.response) {
        throw new HttpException(
          `Moralis API error: ${error.response.data?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Moralis API error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimate cost based on endpoint and method
   * Moralis pricing (approximate):
   * - Basic API calls: $0.0001 - $0.001 per request
   * - Token transfers: $0.0005 per request
   * - Price data: $0.0002 per request
   * - Metadata: $0.0001 per request
   */
  private estimateCost(endpoint: string, method: string): number {
    // Base cost
    let cost = 0.0001;

    // Endpoint-specific costs
    if (endpoint.includes('/transfers')) {
      cost = 0.0005; // Token transfers are more expensive
    } else if (endpoint.includes('/price') || endpoint.includes('/tokenPrice')) {
      cost = 0.0002; // Price data
    } else if (endpoint.includes('/metadata') || endpoint.includes('/erc20/metadata')) {
      cost = 0.0001; // Metadata is cheaper
    } else if (endpoint.includes('/balance') || endpoint.includes('/native')) {
      cost = 0.0003; // Balance queries
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
   * Get token transfers for a specific address
   * Note: This endpoint gets transfers TO/FROM a wallet address, not transfers of a token contract
   * For token contract transfers, you may need to use a different approach
   */
  async getTokenTransfers(
    address: string,
    chain: string = 'eth',
    fromBlock?: number,
    toBlock?: string | number,
    limit: number = 100,
  ): Promise<any> {
    const params: any = {
      chain,
      limit,
    };
    
    // Only add from_block if provided and valid
    if (fromBlock !== undefined && fromBlock !== null) {
      params.from_block = fromBlock;
    }
    
    // Only add to_block if provided and it's not 'latest' (Moralis handles 'latest' automatically)
    if (toBlock !== undefined && toBlock !== null && toBlock !== 'latest') {
      params.to_block = toBlock;
    }

    return this.makeRequest('GET', `/erc20/${address}/transfers`, params);
  }

  /**
   * Get native token transactions for an address
   */
  async getNativeTransactions(
    address: string,
    chain: string = 'eth',
    fromBlock?: number,
    toBlock?: string,
    limit: number = 100,
  ): Promise<any> {
    const params: any = {
      chain,
      limit,
    };
    if (fromBlock) params.from_block = fromBlock;
    if (toBlock) params.to_block = toBlock;

    return this.makeRequest('GET', `/${address}`, params);
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(
    addresses: string[],
    chain: string = 'eth',
  ): Promise<any> {
    const params = {
      chain,
      addresses: addresses.join(','),
    };

    return this.makeRequest('GET', '/erc20/metadata', params);
  }

  /**
   * Get token price
   */
  async getTokenPrice(
    address: string,
    chain: string = 'eth',
  ): Promise<any> {
    const params = {
      chain,
      address,
    };

    return this.makeRequest('GET', `/erc20/${address}/price`, params);
  }
}

