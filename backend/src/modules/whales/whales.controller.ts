import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { WhalesService } from './whales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whales')
@UseGuards(JwtAuthGuard)
export class WhalesController {
  constructor(private readonly whalesService: WhalesService) {}

  @Get('top-buyers')
  async getTopBuyers(
    @Query('tokenId') tokenId: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!tokenId) {
      throw new BadRequestException('tokenId is required');
    }
    return this.whalesService.getTopBuyers(tokenId, hours, limit);
  }

  @Get('exchange-flows')
  async getExchangeFlows(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('tokenId') tokenId?: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.whalesService.getExchangeFlows(tokenId, exchange, hours);
  }

  @Get('token/:tokenId')
  async getTokenWhaleActivity(
    @Param('tokenId') tokenId: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    return this.whalesService.getTokenWhaleActivity(tokenId, hours);
  }
}

