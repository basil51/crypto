import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertType, AlertStatus } from '@prisma/client';

@Injectable()
export class EnhancedAlertTriggerService {
  private readonly logger = new Logger(EnhancedAlertTriggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Trigger whale buy alert
   */
  async triggerWhaleBuyAlert(
    tokenId: string,
    walletAddress: string,
    amount: number,
    metadata?: any,
  ) {
    this.logger.log(`Triggering whale buy alert for token ${tokenId}`);

    // Find users subscribed to this token
    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.WHALE_BUY,
        tokenId,
        metadata: {
          walletAddress,
          amount,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger whale sell alert
   */
  async triggerWhaleSellAlert(
    tokenId: string,
    walletAddress: string,
    amount: number,
    metadata?: any,
  ) {
    this.logger.log(`Triggering whale sell alert for token ${tokenId}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.WHALE_SELL,
        tokenId,
        metadata: {
          walletAddress,
          amount,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger exchange deposit alert
   */
  async triggerExchangeDepositAlert(
    tokenId: string,
    exchange: string,
    amount: number,
    metadata?: any,
  ) {
    this.logger.log(`Triggering exchange deposit alert for token ${tokenId} on ${exchange}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.EXCHANGE_DEPOSIT,
        tokenId,
        metadata: {
          exchange,
          amount,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger exchange withdrawal alert
   */
  async triggerExchangeWithdrawalAlert(
    tokenId: string,
    exchange: string,
    amount: number,
    metadata?: any,
  ) {
    this.logger.log(`Triggering exchange withdrawal alert for token ${tokenId} from ${exchange}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.EXCHANGE_WITHDRAWAL,
        tokenId,
        metadata: {
          exchange,
          amount,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger sell wall created alert
   */
  async triggerSellWallCreatedAlert(
    tokenId: string,
    sellWallId: string,
    size: number,
    price: number,
    exchange: string,
    metadata?: any,
  ) {
    this.logger.log(`Triggering sell wall created alert for token ${tokenId}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.SELL_WALL_CREATED,
        tokenId,
        metadata: {
          sellWallId,
          size,
          price,
          exchange,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger sell wall removed alert
   */
  async triggerSellWallRemovedAlert(
    tokenId: string,
    sellWallId: string,
    metadata?: any,
  ) {
    this.logger.log(`Triggering sell wall removed alert for token ${tokenId}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.SELL_WALL_REMOVED,
        tokenId,
        metadata: {
          sellWallId,
          ...metadata,
        },
      });
    }
  }

  /**
   * Trigger token breakout alert
   */
  async triggerTokenBreakoutAlert(
    tokenId: string,
    volume24h: number,
    priceChange: number,
    metadata?: any,
  ) {
    this.logger.log(`Triggering token breakout alert for token ${tokenId}`);

    const users = await this.getSubscribedUsers(tokenId);

    for (const user of users) {
      await this.createAlert({
        userId: user.id,
        alertType: AlertType.TOKEN_BREAKOUT,
        tokenId,
        metadata: {
          volume24h,
          priceChange,
          ...metadata,
        },
      });
    }
  }

  /**
   * Get users subscribed to a token
   */
  private async getSubscribedUsers(tokenId: string) {
    // Find users who have alerts for this token
    const alerts = await this.prisma.alert.findMany({
      where: {
        tokenId,
        status: {
          in: [AlertStatus.PENDING, AlertStatus.DELIVERED],
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            plan: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
          },
        },
      },
      distinct: ['userId'],
    });

    // Filter to only PRO users with active subscriptions
    return alerts
      .map((a) => a.user)
      .filter(
        (user) =>
          user &&
          user.plan === 'PRO' &&
          (user.subscriptionStatus === 'active' ||
            (user.subscriptionStatus === 'trialing' && user.subscriptionEndsAt &&
              new Date(user.subscriptionEndsAt) > new Date())),
      );
  }

  /**
   * Create an alert
   */
  private async createAlert(data: {
    userId: string;
    alertType: AlertType;
    tokenId: string;
    signalId?: string;
    metadata?: any;
  }) {
    try {
      // Get user's alert preferences (channels)
      const userAlerts = await this.prisma.alert.findFirst({
        where: {
          userId: data.userId,
          tokenId: data.tokenId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const channels = userAlerts?.channels || {
        telegram: false,
        email: true,
      };

      // Check if similar alert already exists (prevent duplicates)
      const existing = await this.prisma.alert.findFirst({
        where: {
          userId: data.userId,
          alertType: data.alertType,
          tokenId: data.tokenId,
          status: AlertStatus.PENDING,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `Alert already exists for user ${data.userId}, token ${data.tokenId}, type ${data.alertType}`,
        );
        return;
      }

      await this.prisma.alert.create({
        data: {
          userId: data.userId,
          alertType: data.alertType,
          tokenId: data.tokenId,
          signalId: data.signalId,
          channels,
          metadata: data.metadata || {},
          status: AlertStatus.PENDING,
        },
      });

      this.logger.log(
        `Created ${data.alertType} alert for user ${data.userId}, token ${data.tokenId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create alert: ${error.message}`,
        error.stack,
      );
    }
  }
}

