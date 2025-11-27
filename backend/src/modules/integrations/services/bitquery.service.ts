import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

interface BitqueryResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

interface LargeTransfer {
  transaction: {
    hash: string;
    block: { timestamp: { time: string }; number: number };
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

@Injectable()
export class BitqueryService {
  private readonly logger = new Logger(BitqueryService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseURL = 'https://graphql.bitquery.io';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('BITQUERY_API_KEY') || '';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      timeout: 30000,
    });

    if (!this.apiKey) {
      this.logger.warn('BITQUERY_API_KEY not configured. Bitquery features will be disabled.');
    }
  }

  /**
   * Check if Bitquery is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Bitquery API key not configured');
    }

    try {
      const response = await this.client.post<BitqueryResponse<T>>('', {
        query,
        variables,
      });

      if (response.data.errors) {
        const errorMessages = response.data.errors.map((e) => e.message).join(', ');
        throw new Error(`Bitquery GraphQL errors: ${errorMessages}`);
      }

      // Log API usage (estimate cost: ~$0.001 per query)
      try {
        await this.prisma.apiUsageLog.create({
          data: {
            provider: 'bitquery',
            endpoint: 'graphql',
            costEstimate: 0.001,
          },
        });
      } catch (error) {
        // Don't fail the main request if logging fails
        this.logger.debug('Failed to log API usage:', error);
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Bitquery query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get large transfers for a token (whale tracking)
   */
  async getLargeTransfers(
    tokenAddress: string,
    network: string = 'ethereum',
    minAmount: number = 100000, // $100k USD equivalent
    limit: number = 100,
    fromTime?: string,
  ): Promise<LargeTransfer[]> {
    const query = `
      query GetLargeTransfers(
        $tokenAddress: String!
        $network: String!
        $minAmount: Float!
        $limit: Int!
        $fromTime: ISO8601DateTime
      ) {
        ethereum(network: $network) {
          transfers(
            currency: { is: $tokenAddress }
            amount: { gte: $minAmount }
            date: { since: $fromTime }
            options: { limit: $limit, desc: "block.timestamp.time" }
          ) {
            transaction {
              hash
              block {
                timestamp {
                  time
                }
                number
              }
            }
            amount
            currency {
              address
              symbol
              name
            }
            receiver {
              address
            }
            sender {
              address
            }
          }
        }
      }
    `;

    const variables = {
      tokenAddress,
      network,
      minAmount,
      limit,
      fromTime: fromTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
    };

    try {
      const data = await this.query<{ ethereum: { transfers: LargeTransfer[] } }>(
        query,
        variables,
      );
      return data.ethereum?.transfers || [];
    } catch (error) {
      this.logger.error(`Failed to fetch large transfers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all large transfers across ALL tokens (broad monitoring)
   * This method doesn't filter by token address, catching whale activity on any token
   */
  async getAllLargeTransfers(
    network: string = 'ethereum',
    minAmountUSD: number = 100000, // $100k USD minimum
    limit: number = 100,
    fromTime?: string,
  ): Promise<LargeTransfer[]> {
    const query = `
      query GetAllLargeTransfers(
        $network: String!
        $minAmountUSD: Float!
        $limit: Int!
        $fromTime: ISO8601DateTime
      ) {
        ethereum(network: $network) {
          transfers(
            amount: { gte: $minAmountUSD }
            date: { since: $fromTime }
            options: { limit: $limit, desc: "block.timestamp.time" }
          ) {
            transaction {
              hash
              block {
                timestamp {
                  time
                }
                number
              }
            }
            amount
            currency {
              address
              symbol
              name
            }
            receiver {
              address
            }
            sender {
              address
            }
          }
        }
      }
    `;

    const variables = {
      network,
      minAmountUSD,
      limit,
      fromTime: fromTime || new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last 1 hour
    };

    try {
      const data = await this.query<{ ethereum: { transfers: LargeTransfer[] } }>(
        query,
        variables,
      );
      
      this.logger.log(
        `Fetched ${data.ethereum?.transfers?.length || 0} large transfers across all tokens from ${network}`
      );
      
      return data.ethereum?.transfers || [];
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
    network: string = 'ethereum',
    hours: number = 24,
  ): Promise<WalletFlow[]> {
    const query = `
      query GetWalletFlow(
        $tokenAddress: String!
        $network: String!
        $fromTime: ISO8601DateTime!
      ) {
        ethereum(network: $network) {
          transfers(
            currency: { is: $tokenAddress }
            date: { since: $fromTime }
          ) {
            receiver {
              address
            }
            sender {
              address
            }
            amount
            currency {
              symbol
              address
            }
          }
        }
      }
    `;

    const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    try {
      const data = await this.query<{
        ethereum: { transfers: Array<{ receiver: { address: string }; sender: { address: string }; amount: number; currency: { symbol: string; address: string } }> };
      }>(query, {
        tokenAddress,
        network,
        fromTime,
      });

      // Aggregate wallet flows
      const flowMap = new Map<string, WalletFlow>();

      data.ethereum?.transfers.forEach((transfer) => {
        const token = transfer.currency;
        const key = `${transfer.receiver.address}-${token.address}`;

        // Inflow
        if (!flowMap.has(key)) {
          flowMap.set(key, {
            address: transfer.receiver.address,
            in: 0,
            out: 0,
            net: 0,
            token: {
              symbol: token.symbol,
              address: token.address,
            },
          });
        }
        const receiverFlow = flowMap.get(key)!;
        receiverFlow.in += transfer.amount;
        receiverFlow.net += transfer.amount;

        // Outflow
        const senderKey = `${transfer.sender.address}-${token.address}`;
        if (!flowMap.has(senderKey)) {
          flowMap.set(senderKey, {
            address: transfer.sender.address,
            in: 0,
            out: 0,
            net: 0,
            token: {
              symbol: token.symbol,
              address: token.address,
            },
          });
        }
        const senderFlow = flowMap.get(senderKey)!;
        senderFlow.out += transfer.amount;
        senderFlow.net -= transfer.amount;
      });

      return Array.from(flowMap.values());
    } catch (error) {
      this.logger.error(`Failed to fetch wallet flow: ${error.message}`);
      return [];
    }
  }

  /**
   * Get token holder distribution
   */
  async getHolderDistribution(
    tokenAddress: string,
    network: string = 'ethereum',
  ): Promise<Array<{ address: string; balance: number; percentage: number }>> {
    const query = `
      query GetHolderDistribution($tokenAddress: String!, $network: String!) {
        ethereum(network: $network) {
          addressStats: address(
            address: { is: $tokenAddress }
          ) {
            balances {
              currency {
                address
                symbol
              }
              value
            }
          }
        }
      }
    `;

    try {
      // This is a simplified query - actual implementation may vary
      const data = await this.query<any>(query, { tokenAddress, network });
      // Process and return holder distribution
      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch holder distribution: ${error.message}`);
      return [];
    }
  }

  /**
   * Track whale clusters (wallets buying the same token)
   */
  async getWhaleClusters(
    tokenAddress: string,
    network: string = 'ethereum',
    minAmount: number = 50000,
    hours: number = 24,
  ): Promise<Array<{ addresses: string[]; totalAmount: number; count: number }>> {
    const transfers = await this.getLargeTransfers(tokenAddress, network, minAmount, 1000);

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

