import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionService } from './services/ingestion.service';
import { PositionsService } from './services/positions.service';
import { DetectionService } from './services/detection.service';
import { SellWallDetectorService } from './services/sell-wall-detector.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { SignalsModule } from '../signals/signals.module';
import { AlertsModule } from '../alerts/alerts.module';
import { OrderbookModule } from '../orderbook/orderbook.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    IntegrationsModule,
    TransactionsModule,
    TokensModule,
    WalletsModule,
    SignalsModule,
    AlertsModule,
    OrderbookModule,
  ],
  providers: [
    JobsService,
    IngestionService,
    PositionsService,
    DetectionService,
    SellWallDetectorService,
  ],
  exports: [
    JobsService,
    IngestionService,
    PositionsService,
    DetectionService,
    SellWallDetectorService,
  ],
})
export class JobsModule {}

