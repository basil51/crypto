import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  async create(@Body() createWalletDto: CreateWalletDto) {
    try {
      return await this.walletsService.create(createWalletDto);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Wallet with this address already exists');
      }
      throw error;
    }
  }

  @Get()
  findAll() {
    return this.walletsService.findAll();
  }

  @Get('by-address/:address')
  async findByAddress(@Param('address') address: string) {
    return this.walletsService.getWalletDetails(address);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const wallet = await this.walletsService.findOne(id);
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }
    return wallet;
  }

  @Get(':address/performance-history')
  async getPerformanceHistory(
    @Param('address') address: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.walletsService.getPerformanceHistory(address, daysNum);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateWalletDto: Partial<CreateWalletDto>) {
    try {
      return await this.walletsService.update(id, updateWalletDto);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Wallet with ID ${id} not found`);
      }
      throw error;
    }
  }
}

