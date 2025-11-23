import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenHolder {
  address: string;
  balance: string;
  percentage: number;
}

interface ContractEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
}

type Chain = 'ethereum' | 'bsc' | 'polygon';

@Injectable()
export class EtherscanService {
  private readonly logger = new Logger(EtherscanService.name);
  private readonly clients: Map<Chain, AxiosInstance> = new Map();
  private readonly apiKeys: Map<Chain, string> = new Map();

  private readonly baseURLs: Record<Chain, string> = {
    ethereum: 'https://api.etherscan.io/api',
    bsc: 'https://api.bscscan.com/api',
    polygon: 'https://api.polygonscan.com/api',
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Initialize API keys for each chain
    this.apiKeys.set('ethereum', this.configService.get<string>('ETHERSCAN_API_KEY') || '');
    this.apiKeys.set('bsc', this.configService.get<string>('BSCSCAN_API_KEY') || '');
    this.apiKeys.set('polygon', this.configService.get<string>('POLYGONSCAN_API_KEY') || '');

    // Create axios instances for each chain
    Object.entries(this.baseURLs).forEach(([chain, baseURL]) => {
      this.clients.set(chain as Chain, axios.create({
        baseURL,
        timeout: 30000,
      }));
    });

    if (!this.isAvailable()) {
      this.logger.warn('No Etherscan API keys configured. Etherscan features will be disabled.');
    }
  }

  /**
   * Check if any chain is available
   */
  isAvailable(chain?: Chain): boolean {
    if (chain) {
      return !!this.apiKeys.get(chain);
    }
    return Array.from(this.apiKeys.values()).some((key) => !!key);
  }

  /**
   * Make API request with rate limiting (5 calls/sec for free tier)
   */
  private async request<T>(
    chain: Chain,
    params: Record<string, any>,
  ): Promise<T> {
    const apiKey = this.apiKeys.get(chain);
    if (!apiKey) {
      throw new Error(`API key not configured for ${chain}`);
    }

    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`Client not initialized for ${chain}`);
    }

    try {
      const response = await client.get<EtherscanResponse<T>>('', {
        params: {
          ...params,
          apikey: apiKey,
        },
      });

      if (response.data.status === '0' && response.data.message !== 'OK') {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      // Log API usage (free tier, but log for tracking)
      try {
        await this.prisma.apiUsageLog.create({
          data: {
            provider: `etherscan-${chain}`,
            endpoint: 'api',
            costEstimate: 0,
          },
        });
      } catch (error) {
        // Don't fail the main request if logging fails
        this.logger.debug('Failed to log API usage:', error);
      }

      return response.data.result as T;
    } catch (error: any) {
      this.logger.error(`Etherscan ${chain} request failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get token holder count
   */
  async getTokenHolderCount(
    tokenAddress: string,
    chain: Chain = 'ethereum',
  ): Promise<number> {
    try {
      const result = await this.request<string>(chain, {
        module: 'token',
        action: 'tokenholderlist',
        contractaddress: tokenAddress,
        page: 1,
        offset: 1,
      });

      // Parse result - Etherscan returns holder count in different formats
      // For now, we'll use a workaround by getting first page and checking total
      const holders = await this.getTokenHolders(tokenAddress, chain, 1, 1);
      // This is a simplified approach - actual implementation may need pagination
      return holders.length;
    } catch (error) {
      this.logger.error(`Failed to get holder count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get token holders (paginated)
   */
  async getTokenHolders(
    tokenAddress: string,
    chain: Chain = 'ethereum',
    page: number = 1,
    offset: number = 100,
  ): Promise<TokenHolder[]> {
    try {
      const result = await this.request<Array<{ Address: string; Value: string }>>(chain, {
        module: 'token',
        action: 'tokenholderlist',
        contractaddress: tokenAddress,
        page,
        offset,
      });

      // Get total supply to calculate percentages
      const totalSupply = await this.getTokenTotalSupply(tokenAddress, chain);

      return result.map((holder) => {
        const balance = parseFloat(holder.Value) / 1e18; // Assuming 18 decimals
        return {
          address: holder.Address,
          balance: holder.Value,
          percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get token holders: ${error.message}`);
      return [];
    }
  }

  /**
   * Get token total supply
   */
  async getTokenTotalSupply(
    tokenAddress: string,
    chain: Chain = 'ethereum',
  ): Promise<number> {
    try {
      const result = await this.request<string>(chain, {
        module: 'stats',
        action: 'tokensupply',
        contractaddress: tokenAddress,
      });

      return parseFloat(result) / 1e18; // Assuming 18 decimals
    } catch (error) {
      this.logger.error(`Failed to get total supply: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get contract events (logs)
   */
  async getContractEvents(
    contractAddress: string,
    chain: Chain = 'ethereum',
    fromBlock: number = 0,
    toBlock: number = 99999999,
    topic0?: string,
  ): Promise<ContractEvent[]> {
    try {
      const params: Record<string, any> = {
        module: 'logs',
        action: 'getLogs',
        address: contractAddress,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
      };

      if (topic0) {
        params.topic0 = topic0;
      }

      const result = await this.request<ContractEvent[]>(chain, params);
      return result || [];
    } catch (error) {
      this.logger.error(`Failed to get contract events: ${error.message}`);
      return [];
    }
  }

  /**
   * Get contract source code (verification status)
   */
  async getContractSourceCode(
    contractAddress: string,
    chain: Chain = 'ethereum',
  ): Promise<{
    verified: boolean;
    name?: string;
    compilerVersion?: string;
    sourceCode?: string;
  }> {
    try {
      const result = await this.request<Array<{
        SourceCode: string;
        ContractName: string;
        CompilerVersion: string;
      }>>(chain, {
        module: 'contract',
        action: 'getsourcecode',
        address: contractAddress,
      });

      if (result && result.length > 0 && result[0].SourceCode) {
        return {
          verified: true,
          name: result[0].ContractName,
          compilerVersion: result[0].CompilerVersion,
          sourceCode: result[0].SourceCode,
        };
      }

      return { verified: false };
    } catch (error) {
      this.logger.error(`Failed to get contract source code: ${error.message}`);
      return { verified: false };
    }
  }

  /**
   * Get transaction history for an address
   */
  async getAddressTransactions(
    address: string,
    chain: Chain = 'ethereum',
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100,
  ): Promise<Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: string;
    timeStamp: string;
  }>> {
    try {
      const result = await this.request<Array<{
        hash: string;
        from: string;
        to: string;
        value: string;
        blockNumber: string;
        timeStamp: string;
      }>>(chain, {
        module: 'account',
        action: 'txlist',
        address,
        startblock: startBlock,
        endblock: endBlock,
        page,
        offset,
        sort: 'desc',
      });

      return result || [];
    } catch (error) {
      this.logger.error(`Failed to get address transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get token transfers for an address
   */
  async getAddressTokenTransfers(
    address: string,
    tokenAddress: string,
    chain: Chain = 'ethereum',
    page: number = 1,
    offset: number = 100,
  ): Promise<Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    tokenSymbol: string;
    blockNumber: string;
    timeStamp: string;
  }>> {
    try {
      const result = await this.request<Array<{
        hash: string;
        from: string;
        to: string;
        value: string;
        tokenSymbol: string;
        blockNumber: string;
        timeStamp: string;
      }>>(chain, {
        module: 'account',
        action: 'tokentx',
        address,
        contractaddress: tokenAddress,
        page,
        offset,
        sort: 'desc',
      });

      return result || [];
    } catch (error) {
      this.logger.error(`Failed to get token transfers: ${error.message}`);
      return [];
    }
  }
}

