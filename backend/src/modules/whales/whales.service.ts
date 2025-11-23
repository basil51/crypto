import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WhalesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get top buyers for a token in a time window
   */
  async getTopBuyers(
    tokenId: string,
    hours: number = 24,
    limit: number = 10,
  ): Promise<any[]> {
    const cacheKey = `whales:top-buyers:${tokenId}:${hours}:${limit}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Get large buy transactions
        const transactions = await this.prisma.transaction.findMany({
          where: {
            tokenId,
            timestamp: { gte: since },
            amount: { gt: 0 },
          },
          include: {
            toWallet: true,
            token: true,
          },
          orderBy: { amount: 'desc' },
          take: limit * 5, // Get more to filter
        });

        // Group by wallet and sum amounts
        const walletMap = new Map<string, any>();
        for (const tx of transactions) {
          const address = tx.toAddress;
          if (!walletMap.has(address)) {
            walletMap.set(address, {
              address,
              wallet: tx.toWallet,
              totalAmount: 0,
              transactionCount: 0,
              latestTransaction: tx.timestamp,
            });
          }
          const walletData = walletMap.get(address);
          walletData.totalAmount += Number(tx.amount);
          walletData.transactionCount += 1;
          if (tx.timestamp > walletData.latestTransaction) {
            walletData.latestTransaction = tx.timestamp;
          }
        }

        // Sort by total amount and return top N
        return Array.from(walletMap.values())
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, limit);
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Get exchange flows (deposits/withdrawals) for a token
   */
  async getExchangeFlows(
    tokenId?: string,
    exchange?: string,
    hours: number = 24,
  ): Promise<any> {
    const cacheKey = `whales:exchange-flows:${tokenId || 'all'}:${exchange || 'all'}:${hours}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const where: Prisma.ExchangeFlowWhereInput = {
          timestamp: { gte: since },
        };
        if (tokenId) where.tokenId = tokenId;
        if (exchange) where.exchange = exchange;

        const flows = await this.prisma.exchangeFlow.findMany({
          where,
          include: {
            token: true,
          },
          orderBy: { timestamp: 'desc' },
        });

        // Aggregate by flow type
        const inflow = flows
          .filter((f) => f.flowType === 'inflow')
          .reduce((sum, f) => sum + Number(f.amount), 0);
        const outflow = flows
          .filter((f) => f.flowType === 'outflow')
          .reduce((sum, f) => sum + Number(f.amount), 0);

        return {
          flows,
          summary: {
            inflow,
            outflow,
            netFlow: inflow - outflow,
            flowCount: flows.length,
          },
        };
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Get whale activity for a specific token
   */
  async getTokenWhaleActivity(
    tokenId: string,
    hours: number = 24,
  ): Promise<any> {
    const cacheKey = `whales:token:${tokenId}:${hours}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Get whale events
        const events = await this.prisma.whaleEvent.findMany({
          where: {
            tokenId,
            timestamp: { gte: since },
          },
          include: {
            wallet: true,
            token: true,
          },
          orderBy: { timestamp: 'desc' },
        });

        // Get top buyers
        const topBuyers = await this.getTopBuyers(tokenId, hours, 10);

        // Calculate whale score
        const whaleScore = this.calculateWhaleScore(events, topBuyers);

        return {
          events,
          topBuyers,
          whaleScore,
          summary: {
            eventCount: events.length,
            totalVolume: events.reduce((sum, e) => sum + Number(e.amount), 0),
            uniqueWallets: new Set(events.map((e) => e.walletId)).size,
          },
        };
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Calculate whale score (0-100) based on activity
   */
  private calculateWhaleScore(events: any[], topBuyers: any[]): number {
    if (events.length === 0) return 0;

    let score = 0;

    // Large transaction volume (40% weight)
    const totalVolume = events.reduce((sum, e) => sum + Number(e.amount), 0);
    const volumeScore = Math.min(100, (totalVolume / 1000000) * 40); // Normalize
    score += volumeScore * 0.4;

    // Number of whale events (30% weight)
    const eventScore = Math.min(100, events.length * 10);
    score += eventScore * 0.3;

    // Top buyer concentration (30% weight)
    if (topBuyers.length > 0) {
      const topBuyerVolume = topBuyers[0]?.totalAmount || 0;
      const concentrationScore = Math.min(100, (topBuyerVolume / totalVolume) * 100);
      score += concentrationScore * 0.3;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Create a whale event
   */
  async createWhaleEvent(data: {
    tokenId: string;
    walletId?: string;
    eventType: string;
    amount: number;
    valueUsd?: number;
    exchange?: string;
    direction: string;
    timestamp: Date;
    metadata?: any;
  }): Promise<any> {
    const event = await this.prisma.whaleEvent.create({
      data: {
        tokenId: data.tokenId,
        walletId: data.walletId,
        eventType: data.eventType as any,
        amount: data.amount,
        valueUsd: data.valueUsd,
        exchange: data.exchange,
        direction: data.direction,
        timestamp: data.timestamp,
        metadata: data.metadata || {},
      },
      include: {
        token: true,
        wallet: true,
      },
    });

    // Invalidate cache
    await this.cacheService.invalidate(`whales:*:${data.tokenId}*`);

    return event;
  }

  /**
   * Create an exchange flow
   */
  async createExchangeFlow(data: {
    tokenId: string;
    exchange: string;
    flowType: string;
    amount: number;
    valueUsd?: number;
    walletAddress?: string;
    timestamp: Date;
    metadata?: any;
  }): Promise<any> {
    const flow = await this.prisma.exchangeFlow.create({
      data: {
        tokenId: data.tokenId,
        exchange: data.exchange,
        flowType: data.flowType,
        amount: data.amount,
        valueUsd: data.valueUsd,
        walletAddress: data.walletAddress,
        timestamp: data.timestamp,
        metadata: data.metadata || {},
      },
      include: {
        token: true,
      },
    });

    // Invalidate cache
    await this.cacheService.invalidate(`whales:exchange-flows:*`);

    return flow;
  }
}

