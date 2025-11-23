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
}

