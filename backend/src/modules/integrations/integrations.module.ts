import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { MoralisService } from './services/moralis.service';
import { AlchemyService } from './services/alchemy.service';
import { ApiCostService } from './services/api-cost.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, MoralisService, AlchemyService, ApiCostService],
  exports: [IntegrationsService, MoralisService, AlchemyService, ApiCostService],
})
export class IntegrationsModule {}

