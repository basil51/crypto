import { Module, Global } from '@nestjs/common';
import { ConfigThresholdService } from './config.service';

@Global()
@Module({
  providers: [ConfigThresholdService],
  exports: [ConfigThresholdService],
})
export class ConfigModule {}

