import { Module } from '@nestjs/common';
import { BetaController } from './beta.controller';
import { BetaService } from './beta.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [BetaController],
  providers: [BetaService],
  exports: [BetaService],
})
export class BetaModule {}

