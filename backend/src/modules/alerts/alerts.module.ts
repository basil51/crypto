import { Module, forwardRef } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertDispatcherService } from './services/alert-dispatcher.service';
import { TelegramService } from './services/telegram.service';
import { EmailService } from './services/email.service';
import { EnhancedAlertTriggerService } from './services/enhanced-alert-trigger.service';
import { BroadMonitoringService } from './services/broad-monitoring.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    forwardRef(() => WebSocketModule),
    IntegrationsModule,
    TokensModule,
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertDispatcherService,
    TelegramService,
    EmailService,
    EnhancedAlertTriggerService,
    BroadMonitoringService,
  ],
  exports: [
    AlertsService,
    AlertDispatcherService,
    TelegramService,
    EmailService,
    EnhancedAlertTriggerService,
    BroadMonitoringService,
  ],
})
export class AlertsModule {}

