import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Alert, AlertStatus } from '@prisma/client';
import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';

@Injectable()
export class AlertDispatcherService {
  private readonly logger = new Logger(AlertDispatcherService.name);
  private readonly dashboardUrl: string;

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.dashboardUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Process and dispatch alerts for new accumulation signals
   */
  async dispatchAlertsForSignal(signalId: string): Promise<void> {
    this.logger.log(`Dispatching alerts for signal ${signalId}`);

    try {
      // Get the signal
      const signal = await this.prisma.accumulationSignal.findUnique({
        where: { id: signalId },
        include: { token: true },
      });

      if (!signal) {
        this.logger.warn(`Signal ${signalId} not found`);
        return;
      }

      // Find all users who should receive alerts for this token
      // For now, we'll check if there are any existing alerts/subscriptions
      // In the future, this would check user watchlists or token subscriptions

      // Get all pending alerts for this signal
      const alerts = await this.prisma.alert.findMany({
        where: {
          signalId,
          status: AlertStatus.PENDING,
        },
        include: {
          user: true,
          signal: { include: { token: true } },
        },
      });

      if (alerts.length === 0) {
        this.logger.debug(`No pending alerts found for signal ${signalId}`);
        return;
      }

      this.logger.log(`Processing ${alerts.length} alerts for signal ${signalId}`);

      // Process each alert
      for (const alert of alerts) {
        try {
          await this.dispatchAlert(alert);
        } catch (error) {
          this.logger.error(
            `Failed to dispatch alert ${alert.id}: ${error.message}`,
            error.stack,
          );
          // Mark as failed
          await this.prisma.alert.update({
            where: { id: alert.id },
            data: { status: AlertStatus.FAILED },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch alerts for signal ${signalId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Dispatch a single alert
   */
  private async dispatchAlert(alert: Alert & { user: any; signal: any }): Promise<void> {
    this.logger.debug(`Dispatching alert ${alert.id} to user ${alert.userId}`);

    const channels = alert.channels as { telegram?: boolean; email?: boolean };
    const signal = alert.signal;
    const token = signal.token;

    let deliverySuccess = false;
    const deliveryErrors: string[] = [];

    // Send via Telegram if enabled
    if (channels.telegram && this.telegramService.isConfigured()) {
      try {
        // Get user's Telegram chat ID (stored in user metadata or separate field)
        // For MVP, we'll use a default or check user metadata
        const telegramChatId = (alert.user as any).telegramChatId || 
                              (alert.user as any).metadata?.telegramChatId;
        
        if (telegramChatId) {
          const telegramMessage = this.telegramService.formatAlertMessage(
            signal,
            token,
            `${this.dashboardUrl}/signals/${signal.id}`,
          );
          const sent = await this.telegramService.sendMessage(telegramChatId, telegramMessage);
          if (sent) {
            deliverySuccess = true;
            this.logger.log(`Telegram alert sent to user ${alert.user.email}`);
          } else {
            deliveryErrors.push('Telegram delivery failed');
          }
        } else {
          this.logger.warn(`User ${alert.user.email} has Telegram enabled but no chat ID configured`);
          deliveryErrors.push('Telegram chat ID not configured');
        }
      } catch (error: any) {
        this.logger.error(`Failed to send Telegram alert: ${error.message}`);
        deliveryErrors.push(`Telegram: ${error.message}`);
      }
    }

    // Send via Email if enabled
    if (channels.email && this.emailService.isConfigured()) {
      try {
        const { html, text } = this.emailService.formatAlertEmail(
          signal,
          token,
          `${this.dashboardUrl}/signals/${signal.id}`,
        );
        const sent = await this.emailService.sendEmail(
          alert.user.email,
          `🚨 Accumulation Signal: ${token.symbol} (Score: ${Number(signal.score).toFixed(2)})`,
          html,
          text,
        );
        if (sent) {
          deliverySuccess = true;
          this.logger.log(`Email alert sent to ${alert.user.email}`);
        } else {
          deliveryErrors.push('Email delivery failed');
        }
      } catch (error: any) {
        this.logger.error(`Failed to send email alert: ${error.message}`);
        deliveryErrors.push(`Email: ${error.message}`);
      }
    }

    // Log if no channels are configured
    if (!channels.telegram && !channels.email) {
      this.logger.warn(`Alert ${alert.id} has no delivery channels enabled`);
      deliveryErrors.push('No delivery channels enabled');
    }

    // Update alert status based on delivery result
    if (deliverySuccess) {
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: AlertStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
      this.logger.debug(`Alert ${alert.id} marked as delivered`);
    } else {
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: AlertStatus.FAILED,
        },
      });
      this.logger.warn(`Alert ${alert.id} marked as failed. Errors: ${deliveryErrors.join(', ')}`);
    }
  }

  /**
   * Build alert message
   */
  private buildAlertMessage(signal: any, token: any): string {
    const score = Number(signal.score).toFixed(2);
    const signalType = signal.signalType.replace(/_/g, ' ').toLowerCase();
    
    return `🚨 Accumulation Signal Detected!\n\n` +
           `Token: ${token.name} (${token.symbol})\n` +
           `Chain: ${token.chain}\n` +
           `Score: ${score}/100\n` +
           `Type: ${signalType}\n` +
           `Time Window: ${new Date(signal.windowStart).toLocaleString()} - ${new Date(signal.windowEnd).toLocaleString()}\n` +
           `Wallets Involved: ${Array.isArray(signal.walletsInvolved) ? signal.walletsInvolved.length : 0}`;
  }

  /**
   * Process all pending alerts
   */
  async processPendingAlerts(): Promise<void> {
    this.logger.log('Processing all pending alerts...');

    try {
      const alerts = await this.prisma.alert.findMany({
        where: { status: AlertStatus.PENDING },
        include: {
          user: true,
          signal: { include: { token: true } },
        },
        take: 100, // Process in batches
      });

      if (alerts.length === 0) {
        this.logger.debug('No pending alerts to process');
        return;
      }

      this.logger.log(`Processing ${alerts.length} pending alerts`);

      for (const alert of alerts) {
        try {
          await this.dispatchAlert(alert as any);
        } catch (error) {
          this.logger.error(`Failed to process alert ${alert.id}: ${error.message}`);
        }
      }

      this.logger.log('Pending alerts processing completed');
    } catch (error) {
      this.logger.error(`Failed to process pending alerts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create alerts for a new signal
   */
  async createAlertsForSignal(signalId: string): Promise<void> {
    this.logger.log(`Creating alerts for signal ${signalId}`);

    try {
      const signal = await this.prisma.accumulationSignal.findUnique({
        where: { id: signalId },
        include: { token: true },
      });

      if (!signal) {
        this.logger.warn(`Signal ${signalId} not found`);
        return;
      }

      // For MVP: Create alerts for all users (or users watching this token)
      // In production, this would check user subscriptions/watchlists
      const users = await this.prisma.user.findMany({
        where: {
          plan: 'PRO', // Only PRO users get alerts (or adjust based on your logic)
        },
      });

      if (users.length === 0) {
        this.logger.debug('No users to create alerts for');
        return;
      }

      // Create alerts for each user
      for (const user of users) {
        try {
          // Check if alert already exists
          const existing = await this.prisma.alert.findFirst({
            where: {
              userId: user.id,
              signalId,
            },
          });

          if (existing) {
            continue; // Skip if already exists
          }

          // Create alert with default channels
          await this.prisma.alert.create({
            data: {
              userId: user.id,
              signalId,
              channels: {
                telegram: false, // Will be enabled when user configures
                email: true, // Default to email
              },
              status: AlertStatus.PENDING,
            },
          });
        } catch (error) {
          this.logger.warn(`Failed to create alert for user ${user.id}: ${error.message}`);
        }
      }

      this.logger.log(`Created alerts for ${users.length} users`);
    } catch (error) {
      this.logger.error(
        `Failed to create alerts for signal ${signalId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

