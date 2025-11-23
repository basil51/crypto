import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  RawBodyRequest,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { PlanType } from '@prisma/client';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private stripeService: StripeService,
  ) {}

  /**
   * Create checkout session for subscription
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@Request() req: any, @Body() body: { plan?: PlanType }) {
    const userId = req.user.userId;
    const plan = body.plan || PlanType.PRO;
    return this.billingService.createCheckoutSession(userId, plan);
  }

  /**
   * Create billing portal session
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createBillingPortalSession(@Request() req: any) {
    const userId = req.user.userId;
    return this.billingService.createBillingPortalSession(userId);
  }

  /**
   * Stripe webhook endpoint
   * This endpoint receives events from Stripe
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    try {
      const event = this.stripeService.verifyWebhookSignature(payload, signature);
      await this.billingService.handleWebhookEvent(event);
      return { received: true };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }
}

