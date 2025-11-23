import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AccumulationSignal, Prisma, SignalType } from '@prisma/client';

export interface SignalWithStats extends AccumulationSignal {
  buyAmount?: string;
  buyAmountFormatted?: string;
  transactionCount?: number;
  isBuy?: boolean;
}

@Injectable()
export class SignalsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Determine if a signal type represents a buy or sell
   */
  private isBuySignal(signalType: SignalType): boolean {
    // All current signal types are accumulation/buy signals
    return [
      SignalType.WHALE_INFLOW,
      SignalType.EXCHANGE_OUTFLOW,
      SignalType.LP_INCREASE,
      SignalType.CONCENTRATED_BUYS,
      SignalType.HOLDING_PATTERNS,
    ].includes(signalType);
  }

  /**
   * Calculate total buy amount and transaction count for a signal
   */
  private async calculateSignalStats(signal: AccumulationSignal): Promise<{
    buyAmount: string;
    buyAmountFormatted: string;
    transactionCount: number;
    isBuy: boolean;
  }> {
    const isBuy = this.isBuySignal(signal.signalType);
    
    // Get all transactions in the signal window
    const transactions = await this.prisma.transaction.findMany({
      where: {
        tokenId: signal.tokenId,
        timestamp: {
          gte: signal.windowStart,
          lte: signal.windowEnd,
        },
      },
      select: {
        amount: true,
        toAddress: true,
        fromAddress: true,
      },
    });

    const transactionCount = transactions.length;
    
    // Calculate total buy amount (sum of all incoming transfers)
    // For buy signals, we sum amounts going TO addresses (accumulation)
    let totalAmount = '0';
    if (isBuy) {
      const sum = transactions.reduce((acc, tx) => {
        return acc + Number(tx.amount);
      }, 0);
      totalAmount = sum.toString();
    }

    // Format amount based on token decimals
    const token = await this.prisma.token.findUnique({
      where: { id: signal.tokenId },
      select: { decimals: true, symbol: true },
    });

    const decimals = token?.decimals || 18;
    const formattedAmount = this.formatAmount(totalAmount, decimals);

    return {
      buyAmount: totalAmount,
      buyAmountFormatted: formattedAmount,
      transactionCount,
      isBuy,
    };
  }

  /**
   * Format amount with proper decimals
   */
  private formatAmount(amount: string, decimals: number): string {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    
    // Convert from wei/smallest unit to human-readable
    const divisor = Math.pow(10, decimals);
    const formatted = num / divisor;
    
    // Format with appropriate decimal places
    if (formatted >= 1000000) {
      return `${(formatted / 1000000).toFixed(2)}M`;
    } else if (formatted >= 1000) {
      return `${(formatted / 1000).toFixed(2)}K`;
    } else if (formatted >= 1) {
      return formatted.toFixed(4);
    } else {
      return formatted.toFixed(6);
    }
  }

  /**
   * Enhance signal with transaction stats
   */
  private async enhanceSignal(signal: AccumulationSignal): Promise<SignalWithStats> {
    const stats = await this.calculateSignalStats(signal);
    return {
      ...signal,
      ...stats,
    };
  }

  /**
   * Enhance multiple signals with transaction stats
   */
  private async enhanceSignals(signals: AccumulationSignal[]): Promise<SignalWithStats[]> {
    return Promise.all(signals.map(signal => this.enhanceSignal(signal)));
  }

  async create(data: Prisma.AccumulationSignalCreateInput): Promise<AccumulationSignal> {
    const signal = await this.prisma.accumulationSignal.create({ data });
    // Invalidate signals cache
    await this.cacheService.invalidate('signals:*');
    return signal;
  }

  async findAll(where?: Prisma.AccumulationSignalWhereInput): Promise<SignalWithStats[]> {
    const cacheKey = `signals:list:${JSON.stringify(where || {})}`;
    const signals = await this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.accumulationSignal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { token: true },
      }),
      60, // 1 minute (signals change frequently)
    );
    return this.enhanceSignals(signals);
  }

  async findOne(id: string): Promise<SignalWithStats | null> {
    const cacheKey = `signals:${id}`;
    const signal = await this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.accumulationSignal.findUnique({
        where: { id },
        include: { token: true },
      }),
      300, // 5 minutes
    );
    if (!signal) return null;
    return this.enhanceSignal(signal);
  }

  async findByToken(tokenId: string, limit?: number): Promise<SignalWithStats[]> {
    const cacheKey = `signals:token:${tokenId}:${limit || 'all'}`;
    const signals = await this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.accumulationSignal.findMany({
        where: { tokenId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { token: true },
      }),
      120, // 2 minutes
    );
    return this.enhanceSignals(signals);
  }

  async getRecentSignals(hours: number = 24, minScore?: number, chain?: string): Promise<SignalWithStats[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const where: any = {
      createdAt: { gte: since },
    };
    if (minScore !== undefined) {
      where.score = { gte: minScore };
    }
    if (chain) {
      where.token = { chain };
    }
    const cacheKey = `signals:recent:${hours}:${minScore || 'all'}:${chain || 'all'}`;
    const signals = await this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.accumulationSignal.findMany({
        where,
        orderBy: { score: 'desc' },
        include: { token: true },
      }),
      60, // 1 minute
    );
    return this.enhanceSignals(signals);
  }
}

