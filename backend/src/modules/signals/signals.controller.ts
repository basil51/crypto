import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSignalDto } from './dto/create-signal.dto';
import { Prisma } from '@prisma/client';

@Controller('signals')
@UseGuards(JwtAuthGuard)
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  async create(@Body() createSignalDto: CreateSignalDto) {
    try {
      const data: Prisma.AccumulationSignalCreateInput = {
        score: createSignalDto.score,
        signalType: createSignalDto.signalType,
        windowStart: new Date(createSignalDto.windowStart),
        windowEnd: new Date(createSignalDto.windowEnd),
        walletsInvolved: createSignalDto.walletsInvolved,
        metadata: createSignalDto.metadata || undefined,
        token: { connect: { id: createSignalDto.tokenId } },
      };
      return await this.signalsService.create(data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new BadRequestException('Token not found');
      }
      throw error;
    }
  }

  @Get()
  findAll(
    @Query('chain') chain?: string,
    @Query('minScore') minScore?: string,
    @Query('signalType') signalType?: string,
    @Query('tokenId') tokenId?: string,
    @Query('recentHours') recentHours?: string,
    @Query('limit') limit?: string,
  ) {
    // If tokenId is provided, get signals for that token
    if (tokenId) {
      return this.signalsService.findByToken(tokenId, limit ? parseInt(limit) : undefined);
    }

    // If recentHours is provided, get recent signals
    if (recentHours) {
      const hours = parseInt(recentHours);
      const minScoreNum = minScore ? parseFloat(minScore) : undefined;
      return this.signalsService.getRecentSignals(hours, minScoreNum, chain);
    }

    // Standard filtering
    const where: Prisma.AccumulationSignalWhereInput = {};
    if (chain) where.token = { chain };
    if (minScore) {
      const score = parseFloat(minScore);
      if (isNaN(score) || score < 0 || score > 100) {
        throw new BadRequestException('minScore must be between 0 and 100');
      }
      where.score = { gte: score };
    }
    if (signalType) where.signalType = signalType as any;
    
    const take = limit ? parseInt(limit) : undefined;
    if (take && (isNaN(take) || take < 1 || take > 1000)) {
      throw new BadRequestException('limit must be between 1 and 1000');
    }
    
    return this.signalsService.findAll(where);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const signal = await this.signalsService.findOne(id);
    if (!signal) {
      throw new NotFoundException(`Signal with ID ${id} not found`);
    }
    return signal;
  }
}

