import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SignalsModule } from './modules/signals/signals.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CacheModule } from './common/cache/cache.module';
import { BillingModule } from './modules/billing/billing.module';
import { WhalesModule } from './modules/whales/whales.module';
import { OrderbookModule } from './modules/orderbook/orderbook.module';
import { SellWallsModule } from './modules/sell-walls/sell-walls.module';
import { HealthModule } from './modules/health/health.module';
import { BetaModule } from './modules/beta/beta.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { MonitoringInterceptor } from './common/monitoring/monitoring.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env', 'config/local.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') || 60000, // 1 minute
          limit: config.get<number>('THROTTLE_LIMIT') || 100, // 100 requests per minute
        },
      ],
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    TokensModule,
    WalletsModule,
    TransactionsModule,
    SignalsModule,
    AlertsModule,
    IntegrationsModule,
    JobsModule,
    BillingModule,
    WhalesModule,
    OrderbookModule,
    SellWallsModule,
    HealthModule,
    BetaModule,
    FeedbackModule,
    MonitoringModule,
    PaymentsModule,
    DashboardsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MonitoringInterceptor,
    },
  ],
})
export class AppModule {}

