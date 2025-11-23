import { Module } from '@nestjs/common';
import { WhalesService } from './whales.service';
import { WhalesController } from './whales.controller';
import { WhaleClusterService } from './services/whale-cluster.service';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [TokensModule, WalletsModule, PrismaModule],
  controllers: [WhalesController],
  providers: [WhalesService, WhaleClusterService],
  exports: [WhalesService, WhaleClusterService],
})
export class WhalesModule {}

