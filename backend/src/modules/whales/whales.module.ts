import { Module } from '@nestjs/common';
import { WhalesService } from './whales.service';
import { WhalesController } from './whales.controller';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [TokensModule, WalletsModule],
  controllers: [WhalesController],
  providers: [WhalesService],
  exports: [WhalesService],
})
export class WhalesModule {}

