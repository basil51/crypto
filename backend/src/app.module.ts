import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

