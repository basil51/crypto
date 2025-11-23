import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [BillingController],
  providers: [BillingService, StripeService, SubscriptionGuard],
  exports: [BillingService, StripeService, SubscriptionGuard],
})
export class BillingModule {}

