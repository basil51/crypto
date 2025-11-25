import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';

@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  async create(@Body() createTokenDto: CreateTokenDto) {
    try {
      return await this.tokensService.create(createTokenDto);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Token with this contract address already exists');
      }
      throw error;
    }
  }

  @Get()
  findAll(
    @Query('chain') chain?: string,
    @Query('active') active?: string,
    @Query('withSignals') withSignals?: string,
  ) {
    const where: any = {};
    if (chain) where.chain = chain;
    if (active !== undefined) where.active = active === 'true';
    
    // If withSignals is true, return tokens with signal statistics
    if (withSignals === 'true') {
      return this.tokensService.findAllWithSignals(where);
    }
    
    return this.tokensService.findAll(where);
  }

  @Get('by-address')
  async findByAddress(
    @Query('chain') chain: string,
    @Query('address') address: string,
  ) {
    if (!chain || !address) {
      throw new BadRequestException('chain and address are required');
    }
    const token = await this.tokensService.findByAddress(chain, address);
    if (!token) {
      throw new NotFoundException(`Token not found for chain ${chain} and address ${address}`);
    }
    return token;
  }

  @Get('by-symbol')
  async findBySymbol(
    @Query('chain') chain: string,
    @Query('symbol') symbol: string,
  ) {
    if (!chain || !symbol) {
      throw new BadRequestException('chain and symbol are required');
    }
    const token = await this.tokensService.findBySymbol(chain, symbol);
    if (!token) {
      throw new NotFoundException(`Token not found for chain ${chain} and symbol ${symbol}`);
    }
    return token;
  }

  @Get(':id/price-history')
  async getPriceHistory(
    @Param('id') id: string,
    @Query('timeframe') timeframe?: string,
  ) {
    return this.tokensService.getPriceHistory(id, timeframe || '24h');
  }

  @Get('alpha-screener')
  async alphaScreener(
    @Query('chain') chain?: string,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('minVolume24h') minVolume24h?: string,
    @Query('maxVolume24h') maxVolume24h?: string,
    @Query('minMarketCap') minMarketCap?: string,
    @Query('maxMarketCap') maxMarketCap?: string,
    @Query('minWhaleInflowPercent') minWhaleInflowPercent?: string,
    @Query('minAccumulationScore') minAccumulationScore?: string,
    @Query('minSmartWallets') minSmartWallets?: string,
    @Query('preset') preset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    if (chain) filters.chain = chain;
    if (minAge) filters.minAge = parseInt(minAge);
    if (maxAge) filters.maxAge = parseInt(maxAge);
    if (minVolume24h) filters.minVolume24h = parseFloat(minVolume24h);
    if (maxVolume24h) filters.maxVolume24h = parseFloat(maxVolume24h);
    if (minMarketCap) filters.minMarketCap = parseFloat(minMarketCap);
    if (maxMarketCap) filters.maxMarketCap = parseFloat(maxMarketCap);
    if (minWhaleInflowPercent)
      filters.minWhaleInflowPercent = parseFloat(minWhaleInflowPercent);
    if (minAccumulationScore)
      filters.minAccumulationScore = parseFloat(minAccumulationScore);
    if (minSmartWallets) filters.minSmartWallets = parseInt(minSmartWallets);
    if (preset) filters.preset = preset;
    if (sortBy) filters.sortBy = sortBy;
    if (sortOrder) filters.sortOrder = sortOrder;
    if (limit) filters.limit = parseInt(limit);

    return this.tokensService.alphaScreener(filters);
  }

  @Get(':id/current-price')
  async getCurrentPrice(@Param('id') id: string) {
    const price = await this.tokensService.getCurrentPrice(id);
    if (price === null) {
      throw new NotFoundException(`Price not available for token ${id}`);
    }
    return { price };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const token = await this.tokensService.findOne(id);
    if (!token) {
      throw new NotFoundException(`Token with ID ${id} not found`);
    }
    return token;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTokenDto: UpdateTokenDto) {
    try {
      return await this.tokensService.update(id, updateTokenDto);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Token with ID ${id} not found`);
      }
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.tokensService.remove(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Token with ID ${id} not found`);
      }
      throw error;
    }
  }
}

