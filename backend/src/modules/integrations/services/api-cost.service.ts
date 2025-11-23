import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApiCostService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get total cost for a provider in a time period
   */
  async getTotalCost(
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where: any = { provider };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const result = await this.prisma.apiUsageLog.aggregate({
      where,
      _sum: {
        costEstimate: true,
      },
    });

    return Number(result._sum.costEstimate || 0);
  }

  /**
   * Get cost breakdown by provider
   */
  async getCostByProvider(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await this.prisma.apiUsageLog.findMany({
      where,
      select: {
        provider: true,
        costEstimate: true,
      },
    });

    const breakdown: Record<string, number> = {};
    for (const log of logs) {
      if (log.costEstimate) {
        breakdown[log.provider] = (breakdown[log.provider] || 0) + Number(log.costEstimate);
      }
    }

    return breakdown;
  }

  /**
   * Get cost breakdown by endpoint
   */
  async getCostByEndpoint(
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, number>> {
    const where: any = { provider };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await this.prisma.apiUsageLog.findMany({
      where,
      select: {
        endpoint: true,
        costEstimate: true,
      },
    });

    const breakdown: Record<string, number> = {};
    for (const log of logs) {
      if (log.costEstimate) {
        breakdown[log.endpoint] = (breakdown[log.endpoint] || 0) + Number(log.costEstimate);
      }
    }

    return breakdown;
  }

  /**
   * Get daily cost summary
   */
  async getDailyCostSummary(days: number = 7): Promise<Array<{ date: string; cost: number; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.apiUsageLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
        costEstimate: {
          not: null,
        },
      },
      select: {
        timestamp: true,
        costEstimate: true,
      },
    });

    const dailySummary: Record<string, { cost: number; count: number }> = {};

    for (const log of logs) {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailySummary[date]) {
        dailySummary[date] = { cost: 0, count: 0 };
      }
      dailySummary[date].cost += Number(log.costEstimate || 0);
      dailySummary[date].count += 1;
    }

    return Object.entries(dailySummary)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get request count and cost for a provider
   */
  async getProviderStats(
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ count: number; totalCost: number; avgCost: number }> {
    const where: any = { provider };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [count, costResult] = await Promise.all([
      this.prisma.apiUsageLog.count({ where }),
      this.prisma.apiUsageLog.aggregate({
        where,
        _sum: { costEstimate: true },
        _avg: { costEstimate: true },
      }),
    ]);

    const totalCost = Number(costResult._sum.costEstimate || 0);
    const avgCost = Number(costResult._avg.costEstimate || 0);

    return { count, totalCost, avgCost };
  }
}

