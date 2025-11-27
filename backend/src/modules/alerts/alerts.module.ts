import { Module, forwardRef } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertDispatcherService } from './services/alert-dispatcher.service';
import { TelegramService } from './services/telegram.service';
import { EmailService } from './services/email.service';
import { EnhancedAlertTriggerService } from './services/enhanced-alert-trigger.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebSocketModule)],
  controllers: [AlertsController],
  providers: [AlertsService, AlertDispatcherService, TelegramService, EmailService, EnhancedAlertTriggerService],
  exports: [AlertsService, AlertDispatcherService, TelegramService, EmailService, EnhancedAlertTriggerService],
})
export class AlertsModule {}

