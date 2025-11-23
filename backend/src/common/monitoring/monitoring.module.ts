import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';
import { MonitoringInterceptor } from './monitoring.interceptor';

@Global()
@Module({
  providers: [SentryService, MonitoringInterceptor],
  exports: [SentryService, MonitoringInterceptor],
})
export class MonitoringModule {}

