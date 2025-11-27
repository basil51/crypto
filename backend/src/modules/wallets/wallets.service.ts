import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Wallet, Prisma } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    return this.prisma.wallet.create({ data });
  }

  async findAll(): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { address } });
  }

  async update(id: string, data: Prisma.WalletUpdateInput): Promise<Wallet> {
    return this.prisma.wallet.update({ where: { id }, data });
  }

  /**
   * Get wallet details with performance metrics
   */
  async getWalletDetails(address: string) {
    // Find or create wallet
    let wallet = await this.findByAddress(address);
    if (!wallet) {
      wallet = await this.create({
        address,
        tracked: false,
      });
    }

    // Get current holdings
    const holdings = await this.getCurrentHoldings(address);

    // Get recent transactions
    const transactions = await this.getRecentTransactions(address, 50);

    // Calculate performance metrics
    const performance = await this.calculatePerformance(address, transactions);

    // Get wallet score
    const score = this.calculateWalletScore(performance);

    return {
      wallet: {
        id: wallet.id,
        address: wallet.address,
        label: wallet.label,
        tracked: wallet.tracked,
        createdAt: wallet.createdAt,
      },
      holdings,
      transactions: transactions.slice(0, 20), // Return top 20 for display
      performance,
      score,
    };
  }

  /**
   * Get current holdings for a wallet
   */
  async getCurrentHoldings(address: string) {
    const wallet = await this.findByAddress(address);
    if (!wallet) {
      return [];
    }

    const positions = await this.prisma.walletPosition.findMany({
      where: { walletId: wallet.id },
      include: {
        token: true,
      },
      orderBy: { lastUpdatedAt: 'desc' },
    });

    return positions.map((pos) => ({
      token: {
        id: pos.token.id,
        symbol: pos.token.symbol,
        name: pos.token.name,
        chain: pos.token.chain,
        contractAddress: pos.token.contractAddress,
      },
      balance: pos.balance.toString(),
      lastUpdatedAt: pos.lastUpdatedAt,
    }));
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(address: string, limit: number = 50) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromAddress: address },
          { toAddress: address },
        ],
      },
      include: {
        token: true,
        fromWallet: true,
        toWallet: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      txHash: tx.txHash,
      type: tx.fromAddress.toLowerCase() === address.toLowerCase() ? 'SELL' : 'BUY',
      token: {
        id: tx.token.id,
        symbol: tx.token.symbol,
        name: tx.token.name,
        chain: tx.token.chain,
        contractAddress: tx.token.contractAddress,
      },
      amount: tx.amount.toString(),
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      blockNumber: tx.blockNumber.toString(),
      timestamp: tx.timestamp,
    }));
  }

  /**
   * Calculate wallet performance metrics
   */
  async calculatePerformance(address: string, transactions: any[]) {
    if (transactions.length === 0) {
      return {
        totalPnL: 0,
        totalPnLPercent: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgWin: 0,
        avgLoss: 0,
      };
    }

    // Group transactions by token
    const tokenTrades = new Map<string, any[]>();
    transactions.forEach((tx) => {
      const tokenId = tx.token.id;
      if (!tokenTrades.has(tokenId)) {
        tokenTrades.set(tokenId, []);
      }
      tokenTrades.get(tokenId)!.push(tx);
    });

    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalTrades = 0;
    const wins: number[] = [];
    const losses: number[] = [];

    // Calculate PnL for each token
    for (const [tokenId, tokenTxs] of tokenTrades.entries()) {
      // Get buy and sell transactions
      const buys = tokenTxs.filter((tx) => tx.type === 'BUY');
      const sells = tokenTxs.filter((tx) => tx.type === 'SELL');

      if (buys.length === 0) continue;

      // Calculate average buy price
      let totalBuyAmount = 0;
      let totalBuyValue = 0;
      buys.forEach((buy) => {
        const amount = parseFloat(buy.amount);
        totalBuyAmount += amount;
        // For simplicity, assume 1:1 value (in production, use actual price at time of buy)
        totalBuyValue += amount;
      });

      const avgBuyPrice = totalBuyAmount > 0 ? totalBuyValue / totalBuyAmount : 0;

      // Calculate PnL for sells
      sells.forEach((sell) => {
        const sellAmount = parseFloat(sell.amount);
        // For simplicity, assume current value (in production, use actual price at time of sell)
        const sellValue = sellAmount;
        const buyValue = sellAmount * avgBuyPrice;
        const pnl = sellValue - buyValue;
        const pnlPercent = avgBuyPrice > 0 ? ((sellValue - buyValue) / buyValue) * 100 : 0;

        totalPnL += pnl;
        totalTrades++;

        if (pnlPercent > 0) {
          winningTrades++;
          wins.push(pnlPercent);
        } else if (pnlPercent < 0) {
          losingTrades++;
          losses.push(Math.abs(pnlPercent));
        }
      });
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const totalPnLPercent = totalPnL !== 0 ? (totalPnL / Math.abs(totalPnL)) * winRate : 0;

    return {
      totalPnL,
      totalPnLPercent,
      winRate: Math.round(winRate * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
    };
  }

  /**
   * Calculate wallet score (0-100)
   */
  calculateWalletScore(performance: any): number {
    let score = 50; // Base score

    // Win rate contribution (0-30 points)
    const winRatePoints = (performance.winRate / 100) * 30;
    score += winRatePoints;

    // Total PnL contribution (0-20 points)
    // Normalize PnL to 0-20 scale (assuming max 1000% PnL = 20 points)
    const pnlPoints = Math.min((Math.abs(performance.totalPnLPercent) / 1000) * 20, 20);
    if (performance.totalPnLPercent > 0) {
      score += pnlPoints;
    } else {
      score -= pnlPoints;
    }

    // Trade volume contribution (0-20 points)
    // More trades = more experience (assuming max 100 trades = 20 points)
    const volumePoints = Math.min((performance.totalTrades / 100) * 20, 20);
    score += volumePoints;

    // Consistency bonus (0-10 points)
    // Higher win rate with more trades = more consistent
    if (performance.totalTrades > 10 && performance.winRate > 60) {
      score += 10;
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get wallet performance history
   */
  async getPerformanceHistory(address: string, days: number = 30) {
    const wallet = await this.findByAddress(address);
    if (!wallet) {
      return [];
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromAddress: address },
          { toAddress: address },
        ],
        timestamp: {
          gte: startDate,
        },
      },
      include: {
        token: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by day and calculate daily PnL
    const dailyPerformance = new Map<string, { date: string; pnl: number; trades: number }>();

    transactions.forEach((tx) => {
      const date = tx.timestamp.toISOString().split('T')[0];
      if (!dailyPerformance.has(date)) {
        dailyPerformance.set(date, { date, pnl: 0, trades: 0 });
      }
      const day = dailyPerformance.get(date)!;
      day.trades++;
      // Simplified PnL calculation (in production, use actual prices)
      day.pnl += parseFloat(tx.amount.toString()) * 0.01; // Placeholder
    });

    return Array.from(dailyPerformance.values());
  }
}

