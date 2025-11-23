import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { BinancePayService } from './binance-pay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentMethod, PlanType } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly binancePayService: BinancePayService,
  ) {}

  /**
   * Create a new payment
   */
  @Post()
  async createPayment(
    @Request() req: any,
    @Body() body: {
      plan: PlanType;
      paymentMethod: PaymentMethod;
      amount: number;
      currency?: string;
    },
  ) {
    return this.paymentsService.createPayment(
      req.user.userId,
      body.plan,
      body.paymentMethod,
      body.amount,
      body.currency || 'USD',
    );
  }

  /**
   * Get user's payments
   */
  @Get('my')
  async getMyPayments(@Request() req: any, @Query('status') status?: string) {
    return this.paymentsService.getUserPayments(req.user.userId, status as any);
  }

  /**
   * Get payment by ID
   */
  @Get(':id')
  async getPayment(@Request() req: any, @Param('id') id: string) {
    const payment = await this.paymentsService.getPayment(id);
    
    // Users can only view their own payments
    if (payment.userId !== req.user.userId) {
      throw new ForbiddenException('You can only view your own payments');
    }

    return payment;
  }

  /**
   * Create Binance Pay order
   */
  @Post('binance-pay/create')
  async createBinancePayOrder(
    @Request() req: any,
    @Body() body: {
      plan: PlanType;
      amount: number;
      currency?: string;
    },
  ) {
    // First create payment record
    const payment = await this.paymentsService.createPayment(
      req.user.userId,
      body.plan,
      PaymentMethod.BINANCE_PAY,
      body.amount,
      body.currency || 'USDT',
    );

    // Create Binance Pay order
    const order = await this.binancePayService.createOrder({
      env: {
        terminalType: 'WEB',
      },
      merchantTradeNo: payment.id,
      orderAmount: body.amount,
      currency: body.currency || 'USDT',
      goods: {
        goodsType: '01', // Virtual goods
        goodsCategory: 'D000',
        referenceGoodsId: payment.id,
        goodsName: `${body.plan} Subscription`,
        goodsDetail: `Monthly ${body.plan} subscription for crypto signals platform`,
      },
    });

    // Update payment with Binance Pay order ID
    await this.paymentsService.updatePaymentStatus(
      payment.id,
      payment.status,
      {
        ...(payment.metadata as any || {}),
        binancePayOrderId: order.data?.prepayId,
        binancePayPrepayId: order.data?.prepayId,
        binancePayQrCode: order.data?.qrCodeUrl,
      },
    );

    return {
      paymentId: payment.id,
      ...order.data,
    };
  }

  /**
   * Verify USDT manual payment
   */
  @Post(':id/verify-usdt')
  async verifyUSDTPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { txHash: string },
  ) {
    const payment = await this.paymentsService.getPayment(id);
    
    // Users can only verify their own payments
    if (payment.userId !== req.user.userId) {
      throw new ForbiddenException('You can only verify your own payments');
    }

    return this.paymentsService.verifyUSDTPayment(id, body.txHash);
  }

  /**
   * Binance Pay webhook handler
   */
  @Post('binance-pay/webhook')
  async handleBinancePayWebhook(
    @Body() body: any,
    @Request() req: any,
  ) {
    // Verify webhook signature
    const signature = req.headers['binancepay-signature'];
    const timestamp = req.headers['binancepay-timestamp'];
    const nonce = req.headers['binancepay-nonce'];

    if (!this.binancePayService.verifyWebhookSignature(
      JSON.stringify(body),
      signature,
      timestamp,
      nonce,
    )) {
      throw new Error('Invalid webhook signature');
    }

    // Handle webhook event
    const { bizType, bizId, bizStatus } = body;

    if (bizType === 'PAY' && bizStatus === 'PAID') {
      // Payment successful
      const payment = await this.paymentsService.getPayment(bizId);
      await this.paymentsService.completePayment(payment.id);
    }

    return { success: true };
  }
}

