import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const data: any = {
        txHash: createTransactionDto.txHash,
        fromAddress: createTransactionDto.fromAddress,
        toAddress: createTransactionDto.toAddress,
        amount: createTransactionDto.amount.toString(),
        blockNumber: BigInt(createTransactionDto.blockNumber),
        timestamp: new Date(createTransactionDto.timestamp),
        raw: createTransactionDto.raw || undefined,
        token: { connect: { id: createTransactionDto.tokenId } },
      };
      return await this.transactionsService.create(data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Transaction with this hash already exists');
      }
      throw error;
    }
  }

  @Post('bulk')
  async createMany(@Body() createTransactionsDto: CreateTransactionDto[]) {
    try {
      const data = createTransactionsDto.map((dto) => ({
        txHash: dto.txHash,
        fromAddress: dto.fromAddress,
        toAddress: dto.toAddress,
        tokenId: dto.tokenId,
        amount: dto.amount.toString(),
        blockNumber: BigInt(dto.blockNumber),
        timestamp: new Date(dto.timestamp),
        raw: dto.raw || undefined,
      }));
      return await this.transactionsService.createMany(data);
    } catch (error) {
      throw new BadRequestException('Failed to create transactions: ' + error.message);
    }
  }

  @Get()
  findAll(@Query('tokenId') tokenId?: string, @Query('limit') limit?: string) {
    const where: any = {};
    if (tokenId) where.tokenId = tokenId;
    const take = limit ? parseInt(limit) : undefined;
    if (take && (isNaN(take) || take < 1 || take > 1000)) {
      throw new BadRequestException('Limit must be between 1 and 1000');
    }
    return this.transactionsService.findAll(where, take);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionsService.findOne(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }
}

