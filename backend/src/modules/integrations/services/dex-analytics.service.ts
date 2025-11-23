import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TheGraphService } from './thegraph.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DexAnalyticsService {
  private readonly logger = new Logger(DexAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private theGraphService: TheGraphService,
  ) {}

  /**
   * Process and store DEX swap events from The Graph
   */
  async processDexSwaps(
    tokenAddress: string,
    tokenId: string,
    network: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2' = 'uniswap-v2',
    minAmountUSD: number = 10000,
  ): Promise<number> {
    try {
      const swaps = await this.theGraphService.getLargeSwaps(
        tokenAddress,
        network,
        minAmountUSD,
        1000, // Limit to 1000 swaps per call
      );

      let processed = 0;

      for (const swap of swaps) {
        try {
          // Determine swap type (buy or sell)
          const isBuy = swap.amount0In === '0' && swap.amount1In !== '0';
          const swapType = isBuy ? 'buy' : 'sell';

          // Calculate amounts
          const amountIn = new Prisma.Decimal(swap.amount0In !== '0' ? swap.amount0In : swap.amount1In);
          const amountOut = new Prisma.Decimal(swap.amount0Out !== '0' ? swap.amount0Out : swap.amount1Out);
          const amountUSD = parseFloat(swap.amountUSD);

          // Check if swap already exists
          const existing = await this.prisma.dexSwapEvent.findFirst({
            where: {
              txHash: swap.transaction.id,
              tokenId,
            },
          });

          if (existing) {
            continue; // Skip duplicates
          }

          // Determine DEX name
          const dex = network.includes('uniswap') ? 'uniswap' : 'pancakeswap';

          // Get pool address if available
          const poolAddress = swap.pool?.id || null;

          // Create swap event
          await this.prisma.dexSwapEvent.create({
            data: {
              tokenId,
              dex,
              poolAddress,
              swapType,
              amountIn,
              amountOut,
              walletAddress: swap.to,
              txHash: swap.transaction.id,
              blockNumber: BigInt(0), // The Graph doesn't provide block number directly
              timestamp: new Date(parseInt(swap.transaction.timestamp) * 1000),
              metadata: {
                pool: swap.pool,
                token0Symbol: swap.pool.token0.symbol,
                token1Symbol: swap.pool.token1.symbol,
                amountUSD: amountUSD, // Store in metadata
              },
            },
          });

          processed++;
        } catch (error) {
          this.logger.error(`Failed to process swap ${swap.id}: ${error.message}`);
        }
      }

      this.logger.log(`Processed ${processed} DEX swaps for token ${tokenAddress}`);
      return processed;
    } catch (error) {
      this.logger.error(`Failed to process DEX swaps: ${error.message}`);
      return 0;
    }
  }

  /**
   * Detect liquidity increases/decreases
   */
  async detectLiquidityChanges(
    poolAddress: string,
    network: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2' = 'uniswap-v2',
    hours: number = 24,
  ): Promise<{
    totalMints: number;
    totalBurns: number;
    netLiquidityChange: number;
    mints: Array<{ amountUSD: string; timestamp: string }>;
    burns: Array<{ amountUSD: string; timestamp: string }>;
  }> {
    try {
      const changes = await this.theGraphService.getLiquidityChanges(
        poolAddress,
        network,
        1000,
        Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000),
      );

      const totalMints = changes.mints.length;
      const totalBurns = changes.burns.length;

      const totalMintUSD = changes.mints.reduce(
        (sum, mint) => sum + parseFloat(mint.amountUSD || '0'),
        0,
      );
      const totalBurnUSD = changes.burns.reduce(
        (sum, burn) => sum + parseFloat(burn.amountUSD || '0'),
        0,
      );

      const netLiquidityChange = totalMintUSD - totalBurnUSD;

      return {
        totalMints,
        totalBurns,
        netLiquidityChange,
        mints: changes.mints.map((m) => ({
          amountUSD: m.amountUSD,
          timestamp: m.transaction.timestamp,
        })),
        burns: changes.burns.map((b) => ({
          amountUSD: b.amountUSD,
          timestamp: b.transaction.timestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to detect liquidity changes: ${error.message}`);
      return {
        totalMints: 0,
        totalBurns: 0,
        netLiquidityChange: 0,
        mints: [],
        burns: [],
      };
    }
  }

  /**
   * Get DEX swap statistics for a token
   */
  async getTokenDexStats(
    tokenId: string,
    hours: number = 24,
  ): Promise<{
    totalSwaps: number;
    buySwaps: number;
    sellSwaps: number;
    totalVolumeUSD: number;
    avgSwapSizeUSD: number;
    largestSwapUSD: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const swaps = await this.prisma.dexSwapEvent.findMany({
      where: {
        tokenId,
        timestamp: {
          gte: since,
        },
      },
    });

    const totalSwaps = swaps.length;
    const buySwaps = swaps.filter((s) => s.swapType === 'buy').length;
    const sellSwaps = swaps.filter((s) => s.swapType === 'sell').length;

    const totalVolumeUSD = swaps.reduce((sum, swap) => {
      const metadata = swap.metadata as any;
      const amountUSD = metadata?.amountUSD || 0;
      return sum + (typeof amountUSD === 'number' ? amountUSD : parseFloat(amountUSD.toString()));
    }, 0);

    const avgSwapSizeUSD = totalSwaps > 0 ? totalVolumeUSD / totalSwaps : 0;

    const largestSwapUSD = swaps.length > 0
      ? Math.max(...swaps.map((s) => {
          const metadata = s.metadata as any;
          const amountUSD = metadata?.amountUSD || 0;
          return typeof amountUSD === 'number' ? amountUSD : parseFloat(amountUSD.toString());
        }))
      : 0;

    return {
      totalSwaps,
      buySwaps,
      sellSwaps,
      totalVolumeUSD,
      avgSwapSizeUSD,
      largestSwapUSD,
    };
  }
}

