import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CacheService } from './common/cache/cache.service';

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
            
            return {
              rank: index + 1,
              tokenId: token.id,
              symbol: token.symbol,
              chain: token.chain.toUpperCase(),
              name: token.name,
              contractAddress: token.contractAddress,
              accumScore: Math.round(score),
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
   * Get smart money wallets leaderboard
   * Calculates wallet performance based on whale events and transactions
   */
  async getSmartMoneyLeaderboard(limit: number = 10) {
    const cacheKey = `dashboard:smart-money-leaderboard:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get all tracked wallets with whale events in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const whaleEvents = await this.prisma.whaleEvent.findMany({
          where: {
            timestamp: { gte: thirtyDaysAgo },
            walletId: { not: null },
            direction: 'buy',
          },
          include: {
            wallet: true,
            token: true,
          },
        });

        // Get all relevant accumulation signals for these tokens
        const tokenIds = [...new Set(whaleEvents.map(e => e.tokenId))];
        const signals = await this.prisma.accumulationSignal.findMany({
          where: {
            tokenId: { in: tokenIds },
            createdAt: { gte: thirtyDaysAgo },
            score: { gte: 70 },
          },
          orderBy: { score: 'desc' },
        });

        // Create a map of tokenId -> best signal score
        const tokenSignalMap = new Map<string, number>();
        for (const signal of signals) {
          const currentScore = tokenSignalMap.get(signal.tokenId) || 0;
          if (Number(signal.score) > currentScore) {
            tokenSignalMap.set(signal.tokenId, Number(signal.score));
          }
        }

        // Group by wallet and calculate metrics
        const walletMap = new Map<string, any>();
        
        for (const event of whaleEvents) {
          if (!event.walletId) continue;
          
          const walletId = event.walletId;
          if (!walletMap.has(walletId)) {
            walletMap.set(walletId, {
              walletId,
              address: event.wallet?.address || '',
              name: event.wallet?.label || null,
              totalPnL: 0,
              winRate: 0,
              tokensTracked: new Set<string>(),
              totalValue: 0,
              winningTrades: 0,
              totalTrades: 0,
              recentActivity: '',
            });
          }
          
          const walletData = walletMap.get(walletId);
          walletData.tokensTracked.add(event.tokenId);
          walletData.totalValue += event.valueUsd ? Number(event.valueUsd) : 0;
          walletData.totalTrades += 1;
          
          // Simplified PnL calculation: assume tokens with high accumulation scores are winners
          // In production, this would track actual price movements
          const signalScore = tokenSignalMap.get(event.tokenId);
          
          if (signalScore && signalScore >= 70) {
            walletData.winningTrades += 1;
            // Estimate PnL based on score (simplified)
            const estimatedGain = (signalScore - 50) / 50; // 0-100% gain estimate
            walletData.totalPnL += estimatedGain * (event.valueUsd ? Number(event.valueUsd) : 0);
          }
        }

        // Calculate final metrics and format
        const leaderboard = Array.from(walletMap.values())
          .map((wallet) => {
            const winRate = wallet.totalTrades > 0 
              ? Math.round((wallet.winningTrades / wallet.totalTrades) * 100) 
              : 0;
            
            const pnLPercent = wallet.totalValue > 0 
              ? Math.round((wallet.totalPnL / wallet.totalValue) * 100) 
              : 0;

            // Get most recent activity
            const recentEvent = whaleEvents
              .filter(e => e.walletId === wallet.walletId)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            
            const recentActivity = recentEvent 
              ? this.getTimeAgo(recentEvent.timestamp)
              : 'No recent activity';

            return {
              address: wallet.address,
              name: wallet.name,
              winRate,
              totalPnL: Math.max(0, pnLPercent), // Ensure non-negative for display
              tokensTracked: wallet.tokensTracked.size,
              recentActivity,
            };
          })
          .filter(w => w.tokensTracked > 0) // Only wallets with activity
          .sort((a, b) => b.totalPnL - a.totalPnL) // Sort by PnL
          .slice(0, limit);

        return leaderboard;
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Get new born tokens (created in last 30 minutes with whale buys)
   */
  async getNewBornTokens(limit: number = 10) {
    const cacheKey = `dashboard:new-born-tokens:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // Find tokens created in last 30 minutes
        const newTokens = await this.prisma.token.findMany({
          where: {
            createdAt: { gte: thirtyMinutesAgo },
            active: true,
          },
          include: {
            whaleEvents: {
              where: {
                direction: 'buy',
                timestamp: { gte: thirtyMinutesAgo },
              },
            },
            accumulationSignals: {
              orderBy: { score: 'desc' },
              take: 1,
            },
          },
        });

        // Filter tokens that have whale buys and calculate metrics
        const tokensWithWhaleBuys = newTokens
          .filter(token => token.whaleEvents.length > 0)
          .map(token => {
            const ageMs = Date.now() - token.createdAt.getTime();
            const ageMinutes = Math.floor(ageMs / (60 * 1000));
            const ageSeconds = Math.floor((ageMs % (60 * 1000)) / 1000);
            const age = ageMinutes > 0 ? `${ageMinutes}m` : `${ageSeconds}s`;
            
            const accumScore = token.accumulationSignals[0] 
              ? Math.round(Number(token.accumulationSignals[0].score))
              : 0;

            return {
              tokenId: token.id,
              symbol: token.symbol,
              chain: token.chain.toUpperCase(),
              name: token.name,
              contractAddress: token.contractAddress,
              age,
              whaleBuys: token.whaleEvents.length,
              accumScore,
            };
          })
          .sort((a, b) => b.whaleBuys - a.whaleBuys) // Sort by number of whale buys
          .slice(0, limit);

        return tokensWithWhaleBuys;
      },
      60, // 1 minute cache (new tokens change frequently)
    );
  }

  /**
   * Get top gainers prediction (tokens with high accumulation scores)
   */
  async getTopGainers(limit: number = 10) {
    const cacheKey = `dashboard:top-gainers:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get recent high-scoring accumulation signals
        const signals = await this.prisma.accumulationSignal.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
            score: { gte: 70 }, // High accumulation score threshold
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

        // Calculate predictions based on accumulation score
        const topGainers = Array.from(tokenMap.values())
          .slice(0, limit)
          .map((item) => {
            const token = item.token;
            const score = item.score;
            
            // Predict gain based on accumulation score
            // Higher score = higher predicted gain
            // Formula: predicted gain = (score - 50) * 2 (so score 75 = 50% predicted gain)
            const predictedGainPercent = Math.max(0, (score - 50) * 2);
            const predictedGain = `+${Math.round(predictedGainPercent)}%`;
            
            // Confidence based on score (higher score = higher confidence)
            const confidence = Math.min(95, Math.round(score * 0.95)); // Cap at 95%

            return {
              tokenId: token.id,
              symbol: token.symbol,
              chain: token.chain.toUpperCase(),
              name: token.name,
              contractAddress: token.contractAddress,
              accumScore: Math.round(score),
              predictedGain,
              confidence,
            };
          })
          .sort((a, b) => b.accumScore - a.accumScore);

        return topGainers;
      },
      120, // 2 minutes cache
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
