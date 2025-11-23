import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { ApiCostService } from './services/api-cost.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly apiCostService: ApiCostService,
  ) {}

  @Get('health')
  health() {
    const providers = this.integrationsService.getAvailableProviders();
    return {
      status: 'ok',
      message: 'Integrations module is running',
      providers,
    };
  }

  @Get('costs')
  async getCosts(
    @Query('provider') provider?: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    if (provider) {
      const stats = await this.apiCostService.getProviderStats(provider, startDate);
      const byEndpoint = await this.apiCostService.getCostByEndpoint(provider, startDate);
      return {
        provider,
        period: `${daysNum} days`,
        stats,
        breakdown: {
          byEndpoint,
        },
      };
    }

    const byProvider = await this.apiCostService.getCostByProvider(startDate);
    const dailySummary = await this.apiCostService.getDailyCostSummary(daysNum);
    const totalCost = Object.values(byProvider).reduce((sum, cost) => sum + cost, 0);

    return {
      period: `${daysNum} days`,
      totalCost: parseFloat(totalCost.toFixed(6)),
      breakdown: {
        byProvider,
        daily: dailySummary,
      },
    };
  }
}

