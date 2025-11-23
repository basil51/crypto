import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class BinancePayService {
  private readonly logger = new Logger(BinancePayService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseURL: string;
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BINANCE_PAY_API_KEY') || '';
    this.secretKey = this.configService.get<string>('BINANCE_PAY_SECRET_KEY') || '';
    this.baseURL = this.configService.get<string>('BINANCE_PAY_BASE_URL') || 
      'https://bpay.binanceapi.com';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': '',
        'BinancePay-Nonce': '',
        'BinancePay-Certificate-SN': '',
      },
    });
  }

  /**
   * Create a Binance Pay order
   */
  async createOrder(params: {
    env: { terminalType: string };
    merchantTradeNo: string;
    orderAmount: number;
    currency: string;
    goods: { goodsType: string; goodsCategory: string; referenceGoodsId: string; goodsName: string; goodsDetail?: string };
  }) {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('Binance Pay API credentials not configured');
    }

    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');

    const requestBody = {
      env: params.env,
      merchantTradeNo: params.merchantTradeNo,
      orderAmount: params.orderAmount,
      currency: params.currency,
      goods: params.goods,
    };

    // Sign the request
    const signature = this.signRequest(JSON.stringify(requestBody), timestamp, nonce);

    try {
      const response = await this.client.post('/binancepay/openapi/v2/order', requestBody, {
        headers: {
          'BinancePay-Timestamp': timestamp.toString(),
          'BinancePay-Nonce': nonce,
          'BinancePay-Certificate-SN': this.apiKey,
          'BinancePay-Signature': signature,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Binance Pay order creation failed', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Query order status
   */
  async queryOrder(merchantTradeNo: string) {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('Binance Pay API credentials not configured');
    }

    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');

    const requestBody = {
      merchantTradeNo,
    };

    const signature = this.signRequest(JSON.stringify(requestBody), timestamp, nonce);

    try {
      const response = await this.client.post('/binancepay/openapi/v2/order/query', requestBody, {
        headers: {
          'BinancePay-Timestamp': timestamp.toString(),
          'BinancePay-Nonce': nonce,
          'BinancePay-Certificate-SN': this.apiKey,
          'BinancePay-Signature': signature,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Binance Pay order query failed', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, timestamp: string, nonce: string): boolean {
    const message = `${timestamp}\n${nonce}\n${payload}\n`;
    const expectedSignature = crypto
      .createHmac('sha512', this.secretKey)
      .update(message)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Sign request for Binance Pay API
   */
  private signRequest(payload: string, timestamp: number, nonce: string): string {
    const message = `${timestamp}\n${nonce}\n${payload}\n`;
    return crypto
      .createHmac('sha512', this.secretKey)
      .update(message)
      .digest('hex');
  }
}

