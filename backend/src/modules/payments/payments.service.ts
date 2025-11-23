import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, PlanType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly usdtAddress: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get USDT wallet address from config (for manual transfers)
    this.usdtAddress = this.configService.get<string>('USDT_WALLET_ADDRESS') || '';
  }

  /**
   * Create a payment record
   */
  async createPayment(
    userId: string,
    plan: PlanType,
    paymentMethod: PaymentMethod,
    amount: number,
    currency: string = 'USD',
  ) {
    // Set expiration (15 minutes for manual USDT, 30 minutes for others)
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (paymentMethod === PaymentMethod.USDT_MANUAL ? 15 : 30),
    );

    // Generate USDT address if manual payment
    let usdtAddress: string | null = null;
    let usdtNetwork: string | null = null;
    let usdtAmount: number | null = null;

    if (paymentMethod === PaymentMethod.USDT_MANUAL) {
      // Generate unique payment address or use configured address
      // For now, we'll use a single address with a unique reference
      usdtAddress = this.usdtAddress || this.generatePaymentAddress();
      usdtNetwork = this.configService.get<string>('USDT_NETWORK') || 'TRC20';
      
      // Convert USD amount to USDT (simplified - in production, fetch from exchange API)
      const usdtPrice = await this.getUSDTPrice();
      usdtAmount = amount / usdtPrice;
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        plan,
        paymentMethod,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        expiresAt,
        usdtAddress,
        usdtNetwork,
        usdtAmount,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Payment created: ${payment.id} for user ${userId} via ${paymentMethod}`);

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get user's payments
   */
  async getUserPayments(userId: string, status?: PaymentStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: any,
  ) {
    const updateData: any = { status };

    if (status === PaymentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
  }

  /**
   * Verify USDT payment (manual verification)
   */
  async verifyUSDTPayment(paymentId: string, txHash: string) {
    const payment = await this.getPayment(paymentId);

    if (payment.paymentMethod !== PaymentMethod.USDT_MANUAL) {
      throw new BadRequestException('This payment is not a USDT manual payment');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending status');
    }

    // Update payment with transaction hash
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        usdtTxHash: txHash,
        usdtConfirmedAt: new Date(),
        status: PaymentStatus.PROCESSING,
        metadata: {
          ...(payment.metadata as any || {}),
          verifiedAt: new Date().toISOString(),
          verifiedBy: 'manual', // or 'system' if auto-verified
        },
      },
    });

    // In production, you would verify the transaction on-chain here
    // For now, we'll mark it as processing and require admin approval

    this.logger.log(`USDT payment ${paymentId} verified with tx ${txHash}`);

    return this.getPayment(paymentId);
  }

  /**
   * Complete payment and activate subscription
   */
  async completePayment(paymentId: string) {
    const payment = await this.getPayment(paymentId);

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment is already completed');
    }

    // Update payment status
    await this.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED);

    // Activate user subscription
    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        plan: payment.plan,
        subscriptionStatus: 'active',
        subscriptionEndsAt: this.calculateSubscriptionEndDate(),
      },
    });

    this.logger.log(`Payment ${paymentId} completed, subscription activated for user ${payment.userId}`);

    return this.getPayment(paymentId);
  }

  /**
   * Get USDT price (simplified - in production, fetch from exchange API)
   */
  private async getUSDTPrice(): Promise<number> {
    // In production, fetch from CoinGecko, Binance, or other exchange API
    // For now, return approximate 1:1 with USD
    return 1.0;
  }

  /**
   * Generate unique payment address
   */
  private generatePaymentAddress(): string {
    // In production, this would generate a unique address per payment
    // For now, return a placeholder
    return `USDT_${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  /**
   * Calculate subscription end date (1 month from now)
   */
  private calculateSubscriptionEndDate(): Date {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }
}

