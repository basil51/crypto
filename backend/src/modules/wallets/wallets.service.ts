import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Wallet, Prisma } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    return this.prisma.wallet.create({ data });
  }

  async findAll(): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { address } });
  }

  async update(id: string, data: Prisma.WalletUpdateInput): Promise<Wallet> {
    return this.prisma.wallet.update({ where: { id }, data });
  }
}

