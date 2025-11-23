import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OrderbookService, OrderbookSnapshot } from './orderbook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orderbook')
@UseGuards(JwtAuthGuard)
export class OrderbookController {
  constructor(private readonly orderbookService: OrderbookService) {}

  @Get(':symbol')
  async getOrderbook(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange: string = 'binance',
  ): Promise<OrderbookSnapshot | null> {
    return this.orderbookService.getOrderbook(symbol, exchange);
  }
}

