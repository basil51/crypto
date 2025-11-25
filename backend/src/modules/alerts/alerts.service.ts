import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Alert, Prisma } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.AlertCreateInput): Promise<Alert> {
    return this.prisma.alert.create({ data });
  }

  async findAll(where?: Prisma.AlertWhereInput): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where,
      orderBy: { id: 'desc' },
      include: { user: true, signal: { include: { token: true } } },
    });
  }

  async findOne(id: string): Promise<Alert | null> {
    return this.prisma.alert.findUnique({
      where: { id },
      include: { user: true, signal: { include: { token: true } } },
    });
  }

  async update(id: string, data: Prisma.AlertUpdateInput): Promise<Alert> {
    return this.prisma.alert.update({ where: { id }, data });
  }

  async subscribeToToken(userId: string, tokenId: string, channels: { telegram?: boolean; email?: boolean }): Promise<Alert> {
    // Find the most recent signal for this token, or create a placeholder
    // For MVP: we'll create alerts that will be triggered when signals are detected
    // For now, we'll find the latest signal or create a subscription record
    const latestSignal = await this.prisma.accumulationSignal.findFirst({
      where: { tokenId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestSignal) {
      // If no signal exists yet, we can't create an alert
      // In a production system, you'd have a separate subscriptions table
      // For MVP, we'll throw an error or create a future alert
      throw new NotFoundException('No signals found for this token yet. Alerts will be created when signals are detected.');
    }

    // Check if alert already exists
    const existing = await this.prisma.alert.findFirst({
      where: {
        userId,
        signalId: latestSignal.id,
      },
    });

    if (existing) {
      // Update existing alert with new channels
      return this.prisma.alert.update({
        where: { id: existing.id },
        data: { channels },
      });
    }

    // Create new alert
    return this.prisma.alert.create({
      data: {
        userId,
        signalId: latestSignal.id,
        channels,
        status: 'PENDING',
      },
    });
  }

  async unsubscribeFromToken(userId: string, tokenId: string): Promise<void> {
    // Find all alerts for this user and token
    const alerts = await this.prisma.alert.findMany({
      where: {
        userId,
        signal: {
          tokenId,
        },
      },
    });

    // Delete all matching alerts
    if (alerts.length > 0) {
      await this.prisma.alert.deleteMany({
        where: {
          userId,
          signal: {
            tokenId,
          },
        },
      });
    }
  }

  async getUserSubscriptions(userId: string): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { userId },
      include: {
        signal: {
          include: {
            token: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Get user notifications with enriched data
   */
  async getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false) {
    const where: Prisma.AlertWhereInput = {
      userId,
    };

    if (unreadOnly) {
      where.deliveredAt = null;
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        signal: {
          include: {
            token: true,
          },
        },
        token: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Enrich alerts with formatted data
    return alerts.map((alert) => {
      const token = alert.token || alert.signal?.token;
      const signal = alert.signal;
      return {
        id: alert.id,
        alertType: alert.alertType,
        status: alert.status,
        createdAt: alert.createdAt,
        deliveredAt: alert.deliveredAt,
        isRead: !!alert.deliveredAt,
        token: token ? {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          chain: token.chain,
        } : null,
        metadata: alert.metadata,
        message: this.formatAlertMessage(alert),
        // Include signal information if available
        signal: signal ? {
          id: signal.id,
          score: signal.score,
          signalType: signal.signalType,
          windowStart: signal.windowStart,
          windowEnd: signal.windowEnd,
          walletsInvolved: signal.walletsInvolved,
          metadata: signal.metadata,
        } : null,
      };
    });
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.alert.count({
      where: {
        userId,
        deliveredAt: null,
      },
    });
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: {
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark all user alerts as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.alert.updateMany({
      where: {
        userId,
        deliveredAt: null,
      },
      data: {
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Format alert message based on alert type
   */
  private formatAlertMessage(alert: any): string {
    const token = alert.token || alert.signal?.token;
    const tokenName = token?.symbol || 'Unknown';
    const metadata = alert.metadata || {};

    switch (alert.alertType) {
      case 'WHALE_BUY':
        return `Large buy detected for ${tokenName}: ${this.formatAmount(metadata.amount)}`;
      case 'WHALE_SELL':
        return `Large sell detected for ${tokenName}: ${this.formatAmount(metadata.amount)}`;
      case 'EXCHANGE_DEPOSIT':
        return `Large deposit to ${metadata.exchange} for ${tokenName}: ${this.formatAmount(metadata.amount)}`;
      case 'EXCHANGE_WITHDRAWAL':
        return `Large withdrawal from ${metadata.exchange} for ${tokenName}: ${this.formatAmount(metadata.amount)}`;
      case 'SELL_WALL_CREATED':
        return `New sell wall detected for ${tokenName} at $${metadata.price} (${this.formatAmount(metadata.size)} tokens)`;
      case 'SELL_WALL_REMOVED':
        return `Sell wall removed for ${tokenName}`;
      case 'TOKEN_BREAKOUT':
        return `Breakout detected for ${tokenName}! Volume: ${this.formatAmount(metadata.volume24h)}, Price change: ${metadata.priceChange}%`;
      case 'SIGNAL':
      default:
        return `New signal for ${tokenName}`;
    }
  }

  /**
   * Format large numbers
   */
  private formatAmount(amount: number): string {
    if (!amount) return '0';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  }
}

