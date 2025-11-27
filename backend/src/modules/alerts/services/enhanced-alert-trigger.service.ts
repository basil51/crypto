import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertType, AlertStatus } from '@prisma/client';
import { WebSocketService } from '../../websocket/websocket.service';
import { AlertsService } from '../alerts.service';

@Injectable()
export class EnhancedAlertTriggerService {
  private readonly logger = new Logger(EnhancedAlertTriggerService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => WebSocketService))
    private websocketService?: WebSocketService,
    @Optional() @Inject(forwardRef(() => AlertsService))
    private alertsService?: AlertsService,
  ) {}

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
   * Returns all PRO users with active subscriptions to ensure alerts are created for all tokens
   */
  private async getSubscribedUsers(tokenId: string) {
    // Get all PRO users with active subscriptions
    // This ensures alerts are created for all tokens, not just ones users are already subscribed to
    const users = await this.prisma.user.findMany({
      where: {
        plan: 'PRO',
        OR: [
          { subscriptionStatus: 'active' },
          {
            subscriptionStatus: 'trialing',
            subscriptionEndsAt: {
              gt: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    return users;
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

      const alert = await this.prisma.alert.create({
        data: {
          userId: data.userId,
          alertType: data.alertType,
          tokenId: data.tokenId,
          signalId: data.signalId,
          channels,
          metadata: data.metadata || {},
          status: AlertStatus.PENDING,
        },
        include: {
          token: true,
          signal: {
            include: {
              token: true,
            },
          },
        },
      });

      this.logger.log(
        `Created ${data.alertType} alert for user ${data.userId}, token ${data.tokenId}`,
      );

      // Emit real-time notification via WebSocket
      if (this.websocketService && this.alertsService) {
        try {
          const notification = await this.alertsService.getUserNotifications(
            data.userId,
            1,
            false,
          );
          if (notification && notification.length > 0) {
            await this.websocketService.emitNewNotification(
              data.userId,
              notification[0],
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to emit WebSocket notification: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to create alert: ${error.message}`,
        error.stack,
      );
    }
  }
}

