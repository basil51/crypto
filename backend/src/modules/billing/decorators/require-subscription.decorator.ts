import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../guards/subscription.guard';

export const REQUIRE_SUBSCRIPTION_KEY = 'requireSubscription';
export const RequireSubscription = () =>
  applyDecorators(UseGuards(JwtAuthGuard, SubscriptionGuard));

