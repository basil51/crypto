import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { MoralisService } from './services/moralis.service';
import { AlchemyService } from './services/alchemy.service';
import { BitqueryService } from './services/bitquery.service';
import { EtherscanService } from './services/etherscan.service';
import { TheGraphService } from './services/thegraph.service';
import { DexAnalyticsService } from './services/dex-analytics.service';
import { ApiCostService } from './services/api-cost.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    MoralisService,
    AlchemyService,
    BitqueryService,
    EtherscanService,
    TheGraphService,
    DexAnalyticsService,
    ApiCostService,
  ],
  exports: [
    IntegrationsService,
    MoralisService,
    AlchemyService,
    BitqueryService,
    EtherscanService,
    TheGraphService,
    DexAnalyticsService,
    ApiCostService,
  ],
})
export class IntegrationsModule {}

