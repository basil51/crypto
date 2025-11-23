import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PlanType } from '@prisma/client';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user with subscription info
    const userWithPlan = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!userWithPlan) {
      throw new ForbiddenException('User not found');
    }

    // Check if user has active PRO subscription
    const hasActiveSubscription =
      userWithPlan.plan === PlanType.PRO &&
      (userWithPlan.subscriptionStatus === 'active' ||
        (userWithPlan.subscriptionEndsAt &&
          new Date(userWithPlan.subscriptionEndsAt) > new Date()));

    if (!hasActiveSubscription) {
      throw new ForbiddenException(
        'This feature requires an active PRO subscription',
      );
    }

    return true;
  }
}

