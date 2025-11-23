import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertDispatcherService } from './services/alert-dispatcher.service';
import { TelegramService } from './services/telegram.service';
import { EmailService } from './services/email.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertDispatcherService, TelegramService, EmailService],
  exports: [AlertsService, AlertDispatcherService, TelegramService, EmailService],
})
export class AlertsModule {}

