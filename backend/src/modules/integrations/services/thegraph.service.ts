import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

interface GraphResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

interface LiquidityPool {
  id: string;
  token0: {
    id: string;
    symbol: string;
    name: string;
  };
  token1: {
    id: string;
    symbol: string;
    name: string;
  };
  reserve0: string;
  reserve1: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
}

interface SwapEvent {
  id: string;
  transaction: {
    id: string;
    timestamp: string;
  };
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  amountUSD: string;
  to: string;
  pool: {
    id: string;
    token0: { symbol: string };
    token1: { symbol: string };
  };
}

interface MintEvent {
  id: string;
  transaction: {
    id: string;
    timestamp: string;
  };
  amount0: string;
  amount1: string;
  amountUSD: string;
  pool: {
    id: string;
    token0: { symbol: string };
    token1: { symbol: string };
  };
}

interface BurnEvent {
  id: string;
  transaction: {
    id: string;
    timestamp: string;
  };
  amount0: string;
  amount1: string;
  amountUSD: string;
  pool: {
    id: string;
    token0: { symbol: string };
    token1: { symbol: string };
  };
}

type SubgraphNetwork = 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2';

@Injectable()
export class TheGraphService {
  private readonly logger = new Logger(TheGraphService.name);
  private readonly clients: Map<SubgraphNetwork, AxiosInstance> = new Map();

  private readonly subgraphURLs: Record<SubgraphNetwork, string> = {
    'uniswap-v2': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    'uniswap-v3': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    'pancakeswap-v2': 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v2',
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Initialize GraphQL clients for each subgraph
    Object.entries(this.subgraphURLs).forEach(([network, url]) => {
      this.clients.set(network as SubgraphNetwork, axios.create({
        baseURL: url,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }));
    });
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T>(
    network: SubgraphNetwork,
    query: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    const client = this.clients.get(network);
    if (!client) {
      throw new Error(`Subgraph client not initialized for ${network}`);
    }

    try {
      const response = await client.post<GraphResponse<T>>('', {
        query,
        variables,
      });

      if (response.data.errors) {
        const errorMessages = response.data.errors.map((e) => e.message).join(', ');
        throw new Error(`The Graph query errors: ${errorMessages}`);
      }

      // Log API usage (The Graph is free but rate-limited)
      try {
        await this.prisma.apiUsageLog.create({
          data: {
            provider: 'thegraph',
            endpoint: network,
            costEstimate: 0,
          },
        });
      } catch (error) {
        // Don't fail the main request if logging fails
        this.logger.debug('Failed to log API usage:', error);
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`The Graph query failed for ${network}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get liquidity pools for a token
   */
  async getLiquidityPools(
    tokenAddress: string,
    network: SubgraphNetwork = 'uniswap-v2',
    limit: number = 10,
  ): Promise<LiquidityPool[]> {
    const query = `
      query GetLiquidityPools($tokenAddress: String!, $limit: Int!) {
        pools(
          where: {
            or: [
              { token0: $tokenAddress }
              { token1: $tokenAddress }
            ]
          }
          first: $limit
          orderBy: totalValueLockedUSD
          orderDirection: desc
        ) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          reserve0
          reserve1
          totalValueLockedUSD
          volumeUSD
        }
      }
    `;

    try {
      const data = await this.query<{ pools: LiquidityPool[] }>(
        network,
        query,
        {
          tokenAddress: tokenAddress.toLowerCase(),
          limit,
        },
      );
      return data.pools || [];
    } catch (error) {
      this.logger.error(`Failed to fetch liquidity pools: ${error.message}`);
      return [];
    }
  }

  /**
   * Get large swaps for a token
   */
  async getLargeSwaps(
    tokenAddress: string,
    network: SubgraphNetwork = 'uniswap-v2',
    minAmountUSD: number = 10000,
    limit: number = 100,
    fromTimestamp?: number,
  ): Promise<SwapEvent[]> {
    const query = `
      query GetLargeSwaps(
        $tokenAddress: String!
        $minAmountUSD: BigDecimal!
        $limit: Int!
        $fromTimestamp: BigInt
      ) {
        swaps(
          where: {
            or: [
              { token0: $tokenAddress, amountUSD_gte: $minAmountUSD }
              { token1: $tokenAddress, amountUSD_gte: $minAmountUSD }
            ]
            transaction_: { timestamp_gte: $fromTimestamp }
          }
          first: $limit
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
          }
          amount0In
          amount1In
          amount0Out
          amount1Out
          amountUSD
          to
          pool {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
        }
      }
    `;

    const fromTimestampValue = fromTimestamp || Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    try {
      const data = await this.query<{ swaps: SwapEvent[] }>(
        network,
        query,
        {
          tokenAddress: tokenAddress.toLowerCase(),
          minAmountUSD: minAmountUSD.toString(),
          limit,
          fromTimestamp: fromTimestampValue.toString(),
        },
      );
      return data.swaps || [];
    } catch (error) {
      this.logger.error(`Failed to fetch large swaps: ${error.message}`);
      return [];
    }
  }

  /**
   * Get liquidity changes (mints/burns) for a pool
   */
  async getLiquidityChanges(
    poolAddress: string,
    network: SubgraphNetwork = 'uniswap-v2',
    limit: number = 100,
    fromTimestamp?: number,
  ): Promise<{ mints: MintEvent[]; burns: BurnEvent[] }> {
    const mintQuery = `
      query GetMints($poolAddress: String!, $limit: Int!, $fromTimestamp: BigInt) {
        mints(
          where: {
            pool: $poolAddress
            transaction_: { timestamp_gte: $fromTimestamp }
          }
          first: $limit
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
          }
          amount0
          amount1
          amountUSD
          pool {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
        }
      }
    `;

    const burnQuery = `
      query GetBurns($poolAddress: String!, $limit: Int!, $fromTimestamp: BigInt) {
        burns(
          where: {
            pool: $poolAddress
            transaction_: { timestamp_gte: $fromTimestamp }
          }
          first: $limit
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
          }
          amount0
          amount1
          amountUSD
          pool {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
        }
      }
    `;

    const fromTimestampValue = fromTimestamp || Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    try {
      const [mintData, burnData] = await Promise.all([
        this.query<{ mints: MintEvent[] }>(
          network,
          mintQuery,
          {
            poolAddress: poolAddress.toLowerCase(),
            limit,
            fromTimestamp: fromTimestampValue.toString(),
          },
        ),
        this.query<{ burns: BurnEvent[] }>(
          network,
          burnQuery,
          {
            poolAddress: poolAddress.toLowerCase(),
            limit,
            fromTimestamp: fromTimestampValue.toString(),
          },
        ),
      ]);

      return {
        mints: mintData.mints || [],
        burns: burnData.burns || [],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch liquidity changes: ${error.message}`);
      return { mints: [], burns: [] };
    }
  }

  /**
   * Get pool TVL history
   */
  async getPoolTVLHistory(
    poolAddress: string,
    network: SubgraphNetwork = 'uniswap-v2',
    hours: number = 24,
  ): Promise<Array<{ timestamp: number; tvlUSD: string }>> {
    const query = `
      query GetPoolTVLHistory($poolAddress: String!, $fromTimestamp: BigInt!) {
        poolDayDatas(
          where: {
            pool: $poolAddress
            date_gte: $fromTimestamp
          }
          orderBy: date
          orderDirection: asc
        ) {
          date
          tvlUSD
        }
      }
    `;

    const fromTimestamp = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
    const fromDate = Math.floor(fromTimestamp / 86400); // Days since epoch

    try {
      const data = await this.query<{ poolDayDatas: Array<{ date: number; tvlUSD: string }> }>(
        network,
        query,
        {
          poolAddress: poolAddress.toLowerCase(),
          fromTimestamp: fromDate.toString(),
        },
      );

      return (data.poolDayDatas || []).map((day) => ({
        timestamp: day.date * 86400, // Convert days to seconds
        tvlUSD: day.tvlUSD,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch pool TVL history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent pools with high liquidity (for token discovery)
   */
  async getRecentHighLiquidityPools(
    network: SubgraphNetwork = 'uniswap-v2',
    minLiquidityUSD: number = 10000,
    maxAgeHours: number = 168,
    limit: number = 100,
  ): Promise<any[]> {
    const query = `
      query GetRecentPools($minLiquidity: String!, $minTimestamp: BigInt!, $limit: Int!) {
        pools(
          first: $limit
          orderBy: totalValueLockedUSD
          orderDirection: desc
          where: {
            totalValueLockedUSD_gte: $minLiquidity
            createdAtTimestamp_gte: $minTimestamp
          }
        ) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          totalValueLockedUSD
          volumeUSD
          createdAtTimestamp
        }
      }
    `;

    try {
      const minTimestamp = Math.floor((Date.now() - maxAgeHours * 3600000) / 1000);
      const data = await this.query<{ pools: any[] }>(
        network,
        query,
        {
          minLiquidity: minLiquidityUSD.toString(),
          minTimestamp: minTimestamp.toString(),
          limit,
        },
      );
      return data.pools || [];
    } catch (error) {
      this.logger.error(`Failed to get recent pools from ${network}: ${error.message}`);
      return [];
    }
  }
}

