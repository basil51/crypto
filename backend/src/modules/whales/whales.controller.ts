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
import { WhaleClusterService } from './services/whale-cluster.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireSubscription } from '../billing/decorators/require-subscription.decorator';

@Controller('whales')
@UseGuards(JwtAuthGuard)
export class WhalesController {
  constructor(
    private readonly whalesService: WhalesService,
    private readonly whaleClusterService: WhaleClusterService,
  ) {}

  @Get('top-buyers')
  @RequireSubscription()
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
  @RequireSubscription()
  async getExchangeFlows(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('tokenId') tokenId?: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.whalesService.getExchangeFlows(tokenId, exchange, hours);
  }

  @Get('token/:tokenId')
  @RequireSubscription()
  async getTokenWhaleActivity(
    @Param('tokenId') tokenId: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    return this.whalesService.getTokenWhaleActivity(tokenId, hours);
  }

  @Get('clusters/:tokenId')
  @RequireSubscription()
  async getClusters(
    @Param('tokenId') tokenId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('clusterType') clusterType?: string,
  ) {
    return this.whaleClusterService.getClusters(tokenId, clusterType, limit);
  }

  @Get('relationships')
  @RequireSubscription()
  async getRelationships(
    @Query('minStrength', new DefaultValuePipe(50), ParseIntPipe) minStrength: number,
    @Query('tokenId') tokenId?: string,
  ) {
    return this.whaleClusterService.analyzeRelationships(tokenId, minStrength);
  }

  @Get('wallet/:address/relationships')
  @RequireSubscription()
  async getWalletRelationships(
    @Param('address') address: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.whaleClusterService.getWalletRelationships(address, limit);
  }
}

