import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BinancePayService } from './binance-pay.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, BinancePayService],
  exports: [PaymentsService, BinancePayService],
})
export class PaymentsModule {}

