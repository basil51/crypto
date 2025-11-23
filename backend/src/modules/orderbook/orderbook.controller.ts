import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OrderbookService, OrderbookSnapshot } from './orderbook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireSubscription } from '../billing/decorators/require-subscription.decorator';

@Controller('orderbook')
@UseGuards(JwtAuthGuard)
export class OrderbookController {
  constructor(private readonly orderbookService: OrderbookService) {}

  @Get(':symbol')
  @RequireSubscription()
  async getOrderbook(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange: string = 'binance',
  ): Promise<OrderbookSnapshot | null> {
    return this.orderbookService.getOrderbook(symbol, exchange);
  }
}

