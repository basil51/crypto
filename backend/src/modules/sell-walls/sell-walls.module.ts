import { Module } from '@nestjs/common';
import { SellWallsService } from './sell-walls.service';
import { SellWallsController } from './sell-walls.controller';

@Module({
  controllers: [SellWallsController],
  providers: [SellWallsService],
  exports: [SellWallsService],
})
export class SellWallsModule {}

