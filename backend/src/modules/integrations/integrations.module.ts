import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { MoralisService } from './services/moralis.service';
import { AlchemyService } from './services/alchemy.service';
import { CovalentService } from './services/covalent.service';
import { QuickNodeService } from './services/quicknode.service';
import { EtherscanService } from './services/etherscan.service';
import { TheGraphService } from './services/thegraph.service';
import { DexAnalyticsService } from './services/dex-analytics.service';
import { ApiCostService } from './services/api-cost.service';
import { CoinGeckoService } from './services/coingecko.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    MoralisService,
    AlchemyService,
    CovalentService,
    QuickNodeService,
    EtherscanService,
    TheGraphService,
    DexAnalyticsService,
    ApiCostService,
    CoinGeckoService,
  ],
  exports: [
    IntegrationsService,
    MoralisService,
    AlchemyService,
    CovalentService,
    QuickNodeService,
    EtherscanService,
    TheGraphService,
    DexAnalyticsService,
    ApiCostService,
    CoinGeckoService,
  ],
})
export class IntegrationsModule {}

