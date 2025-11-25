import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MoralisService } from './services/moralis.service';
import { AlchemyService } from './services/alchemy.service';
import { CoinGeckoService } from './services/coingecko.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    public readonly moralis: MoralisService,
    public readonly alchemy: AlchemyService,
    public readonly coingecko: CoinGeckoService,
  ) {}

  async logApiUsage(provider: string, endpoint: string, costEstimate?: number) {
    try {
      return await this.prisma.apiUsageLog.create({
        data: {
          provider,
          endpoint,
          costEstimate: costEstimate ? costEstimate : null,
        },
      });
    } catch (error) {
      // Don't fail the main request if logging fails
      console.error('Failed to log API usage:', error);
      return null;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): { moralis: boolean; alchemy: boolean } {
    return {
      moralis: !!this.configService.get<string>('MORALIS_API_KEY'),
      alchemy: !!this.configService.get<string>('ALCHEMY_API_KEY'),
    };
  }
}

