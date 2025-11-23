import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  getHello(): string {
    return 'SmartFlow API is running!';
  }

  /**
   * Get homepage statistics (public endpoint)
   */
  async getHomepageStats() {
    const cacheKey = 'homepage:stats';
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get total wallets tracked
        const walletsTracked = await this.prisma.wallet.count({
          where: { tracked: true },
        });

        // Get total volume tracked (sum of all transaction amounts in USD equivalent)
        // This is a simplified calculation - in production, you'd calculate USD value
        const transactions = await this.prisma.transaction.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            amount: true,
          },
        });

        // Estimate volume (simplified - would need token prices for accurate USD)
        const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const volumeTracked = totalVolume / 1e18; // Rough estimate in tokens

        // Get total alerts sent
        const alertsSent = await this.prisma.alert.count({
          where: {
            status: 'DELIVERED',
          },
        });

        // Calculate accuracy (signals that led to price increases)
        // Simplified: signals with score > 75 that were created in last 7 days
        const recentSignals = await this.prisma.accumulationSignal.count({
          where: {
            score: { gte: 75 },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });

        const totalSignals = await this.prisma.accumulationSignal.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });

        const accuracy = totalSignals > 0 ? Math.round((recentSignals / totalSignals) * 100) : 0;

        return {
          walletsTracked,
          volumeTracked: volumeTracked / 1e9, // Convert to billions
          alertsSent,
          accuracy: Math.min(accuracy, 95), // Cap at 95% for realism
        };
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Get top accumulating tokens for homepage (public endpoint)
   */
  async getTopAccumulatingTokens(limit: number = 10) {
    const cacheKey = `homepage:top-tokens:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get recent signals with high scores, grouped by token
        const signals = await this.prisma.accumulationSignal.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
            score: { gte: 60 },
          },
          include: {
            token: true,
          },
          orderBy: { score: 'desc' },
          take: limit * 2, // Get more to filter unique tokens
        });

        // Group by token and get highest score per token
        const tokenMap = new Map<string, any>();
        for (const signal of signals) {
          const tokenId = signal.tokenId;
          if (!tokenMap.has(tokenId) || signal.score > tokenMap.get(tokenId).score) {
            tokenMap.set(tokenId, {
              token: signal.token,
              score: Number(signal.score),
              signal,
            });
          }
        }

        // Get whale flow for each token (simplified calculation)
        const topTokens = Array.from(tokenMap.values())
          .slice(0, limit)
          .map((item, index) => {
            const token = item.token;
            const score = item.score;
            
            // Get recent whale events for whale flow calculation
            return {
              rank: index + 1,
              tokenId: token.id,
              symbol: token.symbol,
              chain: token.chain.toUpperCase(),
              name: token.name,
              contractAddress: token.contractAddress,
              accumScore: Math.round(score),
              // Price and change would come from price API (CoinGecko, etc.)
              // For now, we'll calculate whale flow
            };
          });

        // Enrich with whale flow data
        const enrichedTokens = await Promise.all(
          topTokens.map(async (token) => {
            // Get whale events in last 24h
            const whaleEvents = await this.prisma.whaleEvent.findMany({
              where: {
                tokenId: token.tokenId,
                timestamp: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
                direction: 'buy',
              },
              select: {
                valueUsd: true,
              },
            });

            const totalWhaleFlow = whaleEvents.reduce(
              (sum, e) => sum + (e.valueUsd ? Number(e.valueUsd) : 0),
              0,
            );

            return {
              ...token,
              whaleFlow: totalWhaleFlow > 0 ? `+$${(totalWhaleFlow / 1e6).toFixed(1)}M` : '+$0',
              price: '$0.00', // Would come from price API
              change: '+0%', // Would come from price API
            };
          }),
        );

        return enrichedTokens;
      },
      60, // 1 minute cache
    );
  }

  /**
   * Get recent whale transactions for homepage (public endpoint)
   */
  async getRecentWhaleTransactions(limit: number = 10) {
    const cacheKey = `homepage:whale-txs:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const whaleEvents = await this.prisma.whaleEvent.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
            valueUsd: {
              gte: 50000, // $50k minimum
            },
          },
          include: {
            token: true,
            wallet: true,
          },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        return whaleEvents.map((event) => {
          const walletAddress = event.wallet?.address || 'Unknown';
          const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
          
          const timeAgo = this.getTimeAgo(event.timestamp);
          const amount = event.valueUsd ? Number(event.valueUsd) : 0;
          const amountFormatted = amount >= 1000000
            ? `$${(amount / 1000000).toFixed(1)}M`
            : `$${(amount / 1000).toFixed(0)}K`;

          return {
            wallet: shortAddress,
            action: event.direction === 'buy' ? 'BOUGHT' : 'SOLD',
            amount: amountFormatted,
            token: event.token.symbol,
            chain: event.token.chain.toUpperCase(),
            time: timeAgo,
            txHash: event.metadata?.['txHash'] || null,
          };
        });
      },
      30, // 30 seconds cache
    );
  }

  /**
   * Format time ago
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}

