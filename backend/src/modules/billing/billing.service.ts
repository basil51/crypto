import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { PlanType } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Create or get Stripe customer for user
   */
  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripeService.createCustomer(user.email);
    
    // Update user with Stripe customer ID
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(userId: string, plan: PlanType = PlanType.PRO) {
    const customerId = await this.getOrCreateStripeCustomer(userId);
    
    const priceId = this.stripeService.getPriceIdForPlan(plan);
    if (!priceId) {
      throw new BadRequestException(`Price ID not configured for plan: ${plan}`);
    }

    const successUrl = `${this.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.frontendUrl}/billing/cancel`;

    const session = await this.stripeService.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    const returnUrl = `${this.frontendUrl}/settings`;
    const session = await this.stripeService.createBillingPortalSession(
      user.stripeCustomerId,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event: any): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(session: any): Promise<void> {
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!customerId || !subscriptionId) {
      this.logger.warn('Checkout session missing customer or subscription ID');
      return;
    }

    // Find user by Stripe customer ID
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`User not found for Stripe customer: ${customerId}`);
      return;
    }

    // Get subscription details
    const subscription = await this.stripeService.getSubscription(subscriptionId);

    // Update user subscription
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: PlanType.PRO,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: subscription.status,
        subscriptionEndsAt: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
      },
    });

    this.logger.log(`Subscription activated for user ${user.id}`);
  }

  private async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const customerId = subscription.customer;

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`User not found for Stripe customer: ${customerId}`);
      return;
    }

    // Update subscription status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status,
        subscriptionEndsAt: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
        plan: subscription.status === 'active' ? PlanType.PRO : PlanType.FREE,
      },
    });

    this.logger.log(`Subscription updated for user ${user.id}: ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`User not found for Stripe customer: ${customerId}`);
      return;
    }

    // Downgrade to FREE plan
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: PlanType.FREE,
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: null,
        stripeSubscriptionId: null,
      },
    });

    this.logger.log(`Subscription canceled for user ${user.id}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      return;
    }

    // Update subscription end date
    const subscription = await this.stripeService.getSubscription(subscriptionId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionEndsAt: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
      },
    });

    this.logger.log(`Payment succeeded for user ${user.id}`);
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const customerId = invoice.customer;

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      return;
    }

    this.logger.warn(`Payment failed for user ${user.id}`);
    // Could send notification email here
  }
}

