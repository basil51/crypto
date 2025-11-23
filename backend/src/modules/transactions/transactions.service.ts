import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Transaction, Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  async createMany(data: Prisma.TransactionCreateManyInput[]): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }
    return this.prisma.transaction.createMany({ data, skipDuplicates: true });
  }

  async findAll(where?: Prisma.TransactionWhereInput, take?: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where,
      take,
      orderBy: { timestamp: 'desc' },
      include: { token: true },
    });
  }

  async findOne(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({ where: { id }, include: { token: true } });
  }
}

