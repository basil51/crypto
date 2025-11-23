import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { SellWallsService } from './sell-walls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sell-walls')
@UseGuards(JwtAuthGuard)
export class SellWallsController {
  constructor(private readonly sellWallsService: SellWallsService) {}

  @Get()
  async findAll(
    @Query('exchange') exchange?: string,
    @Query('symbol') symbol?: string,
    @Query('activeOnly', new DefaultValuePipe(true), ParseBoolPipe)
    activeOnly?: boolean,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ) {
    return this.sellWallsService.findAll({
      exchange,
      symbol,
      activeOnly,
      limit,
    });
  }

  @Get('token/:tokenId')
  async findByToken(
    @Param('tokenId') tokenId: string,
    @Query('activeOnly', new DefaultValuePipe(true), ParseBoolPipe)
    activeOnly?: boolean,
  ) {
    return this.sellWallsService.findByToken(tokenId, activeOnly);
  }

  @Get('statistics')
  async getStatistics(@Query('exchange') exchange?: string) {
    return this.sellWallsService.getStatistics(exchange);
  }
}

