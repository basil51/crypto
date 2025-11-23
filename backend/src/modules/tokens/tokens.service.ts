import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { Token, Prisma } from '@prisma/client';

@Injectable()
export class TokensService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(data: Prisma.TokenCreateInput): Promise<Token> {
    const token = await this.prisma.token.create({ data });
    // Invalidate tokens cache
    await this.cacheService.invalidate('tokens:*');
    return token;
  }

  async findAll(where?: Prisma.TokenWhereInput): Promise<Token[]> {
    const cacheKey = `tokens:list:${JSON.stringify(where || {})}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.token.findMany({ where, orderBy: { createdAt: 'desc' } }),
      300, // 5 minutes
    );
  }

  /**
   * Get tokens with signal statistics
   */
  async findAllWithSignals(where?: Prisma.TokenWhereInput): Promise<any[]> {
    const tokens = await this.findAll(where);
    
    // Get signal counts and latest signal for each token
    const tokensWithSignals = await Promise.all(
      tokens.map(async (token) => {
        const [signalCount, latestSignal] = await Promise.all([
          this.prisma.accumulationSignal.count({
            where: { tokenId: token.id },
          }),
          this.prisma.accumulationSignal.findFirst({
            where: { tokenId: token.id },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              score: true,
              signalType: true,
              createdAt: true,
            },
          }),
        ]);

        return {
          ...token,
          signalCount,
          latestSignal: latestSignal || null,
        };
      }),
    );

    return tokensWithSignals;
  }

  async findOne(id: string): Promise<Token | null> {
    const cacheKey = `tokens:${id}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.token.findUnique({ where: { id } }),
      600, // 10 minutes
    );
  }

  async findByAddress(chain: string, contractAddress: string): Promise<Token | null> {
    const cacheKey = `tokens:${chain}:${contractAddress.toLowerCase()}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.token.findFirst({
        where: {
          chain: chain.toLowerCase(),
          contractAddress: contractAddress.toLowerCase(),
        },
      }),
      600, // 10 minutes
    );
  }

  async update(id: string, data: Prisma.TokenUpdateInput): Promise<Token> {
    const token = await this.prisma.token.update({ where: { id }, data });
    // Invalidate specific token and list caches
    await this.cacheService.del(`tokens:${id}`);
    await this.cacheService.invalidate('tokens:list:*');
    return token;
  }

  async remove(id: string): Promise<Token> {
    const token = await this.prisma.token.delete({ where: { id } });
    // Invalidate caches
    await this.cacheService.del(`tokens:${id}`);
    await this.cacheService.invalidate('tokens:list:*');
    return token;
  }
}

