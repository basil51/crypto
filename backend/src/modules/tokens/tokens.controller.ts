import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, NotFoundException } from '@nestjs/common';
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

