import { Module } from '@nestjs/common';
import { OrderbookService } from './orderbook.service';
import { OrderbookController } from './orderbook.controller';

@Module({
  controllers: [OrderbookController],
  providers: [OrderbookService],
  exports: [OrderbookService],
})
export class OrderbookModule {}

