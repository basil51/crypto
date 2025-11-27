import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SellWallsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get all sell walls with optional filters
   */
  async findAll(params?: {
    exchange?: string;
    symbol?: string;
    activeOnly?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const cacheKey = `sell-walls:${JSON.stringify(params || {})}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.SellOfferWhereInput = {};

        if (params?.exchange) {
          where.exchange = params.exchange;
        }

        if (params?.symbol) {
          where.symbol = params.symbol;
        }

        if (params?.activeOnly) {
          where.removedAt = null;
        }

        const take = params?.limit || 100;

        const sellWalls = await this.prisma.sellOffer.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
          take,
        });

        // Enrich with token information
        const enrichedWalls = await Promise.all(
          sellWalls.map(async (wall) => {
            let tokenSymbol = (wall.metadata as any)?.tokenSymbol;
            let tokenName = (wall.metadata as any)?.tokenName;
            let tokenId = (wall.metadata as any)?.tokenId;

            // Check if symbol is a UUID (old format where tokenId was stored in symbol field)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!tokenId && uuidRegex.test(wall.symbol)) {
              tokenId = wall.symbol;
            }

            // If we have tokenId but no token info, look it up
            if (tokenId && (!tokenSymbol || !tokenName)) {
              try {
                const token = await this.prisma.token.findUnique({
                  where: { id: tokenId },
                  select: { symbol: true, name: true },
                });
                if (token) {
                  tokenSymbol = token.symbol;
                  tokenName = token.name;
                }
              } catch (error) {
                // Token not found, continue without token info
              }
            }

            // If we still don't have token info, try to find token by symbol
            // (in case symbol is a token symbol like "BTC" or "ETH")
            if (!tokenSymbol && !tokenName && !uuidRegex.test(wall.symbol)) {
              try {
                // Try to extract token symbol from exchange symbol (e.g., "BTCUSDT" -> "BTC")
                // This is a simple heuristic - might need improvement
                const possibleSymbols = [
                  wall.symbol.replace('USDT', '').replace('USDC', '').replace('BUSD', ''),
                  wall.symbol.slice(0, -4), // Remove last 4 chars (USDT)
                  wall.symbol.slice(0, -3), // Remove last 3 chars (USD)
                ];

                for (const possibleSymbol of possibleSymbols) {
                  if (possibleSymbol && possibleSymbol.length >= 2) {
                    const token = await this.prisma.token.findFirst({
                      where: {
                        symbol: {
                          equals: possibleSymbol,
                          mode: 'insensitive',
                        },
                      },
                      select: { symbol: true, name: true, id: true },
                    });
                    if (token) {
                      tokenSymbol = token.symbol;
                      tokenName = token.name;
                      tokenId = token.id;
                      break;
                    }
                  }
                }
              } catch (error) {
                // Token lookup failed, continue without token info
              }
            }

            return {
              ...wall,
              tokenSymbol: tokenSymbol || null,
              tokenName: tokenName || null,
              tokenId: tokenId || null,
            };
          }),
        );

        return enrichedWalls;
      },
      60, // 1 minute cache
    );
  }

  /**
   * Get sell walls for a specific token
   */
  async findByToken(tokenId: string, activeOnly: boolean = true): Promise<any[]> {
    const cacheKey = `sell-walls:token:${tokenId}:${activeOnly}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.SellOfferWhereInput = {
          symbol: tokenId,
        };

        if (activeOnly) {
          where.removedAt = null;
        }

        const sellWalls = await this.prisma.sellOffer.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
        });

        // Enrich with token information
        const enrichedWalls = await Promise.all(
          sellWalls.map(async (wall) => {
            let tokenSymbol = (wall.metadata as any)?.tokenSymbol;
            let tokenName = (wall.metadata as any)?.tokenName;
            let tokenId = (wall.metadata as any)?.tokenId;

            // Check if symbol is a UUID (old format where tokenId was stored in symbol field)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!tokenId && uuidRegex.test(wall.symbol)) {
              tokenId = wall.symbol;
            }

            // If we have tokenId but no token info, look it up
            if (tokenId && (!tokenSymbol || !tokenName)) {
              try {
                const token = await this.prisma.token.findUnique({
                  where: { id: tokenId },
                  select: { symbol: true, name: true },
                });
                if (token) {
                  tokenSymbol = token.symbol;
                  tokenName = token.name;
                }
              } catch (error) {
                // Token not found, continue without token info
              }
            }

            // If we still don't have token info, try to find token by symbol
            // (in case symbol is a token symbol like "BTC" or "ETH")
            if (!tokenSymbol && !tokenName && !uuidRegex.test(wall.symbol)) {
              try {
                // Try to extract token symbol from exchange symbol (e.g., "BTCUSDT" -> "BTC")
                // This is a simple heuristic - might need improvement
                const possibleSymbols = [
                  wall.symbol.replace('USDT', '').replace('USDC', '').replace('BUSD', ''),
                  wall.symbol.slice(0, -4), // Remove last 4 chars (USDT)
                  wall.symbol.slice(0, -3), // Remove last 3 chars (USD)
                ];

                for (const possibleSymbol of possibleSymbols) {
                  if (possibleSymbol && possibleSymbol.length >= 2) {
                    const token = await this.prisma.token.findFirst({
                      where: {
                        symbol: {
                          equals: possibleSymbol,
                          mode: 'insensitive',
                        },
                      },
                      select: { symbol: true, name: true, id: true },
                    });
                    if (token) {
                      tokenSymbol = token.symbol;
                      tokenName = token.name;
                      tokenId = token.id;
                      break;
                    }
                  }
                }
              } catch (error) {
                // Token lookup failed, continue without token info
              }
            }

            return {
              ...wall,
              tokenSymbol: tokenSymbol || null,
              tokenName: tokenName || null,
              tokenId: tokenId || null,
            };
          }),
        );

        return enrichedWalls;
      },
      60, // 1 minute cache
    );
  }

  /**
   * Get sell wall statistics
   */
  async getStatistics(exchange?: string): Promise<any> {
    const cacheKey = `sell-walls:stats:${exchange || 'all'}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.SellOfferWhereInput = {};
        if (exchange) {
          where.exchange = exchange;
        }

        const [total, active, removed, totalValue] = await Promise.all([
          this.prisma.sellOffer.count({ where }),
          this.prisma.sellOffer.count({
            where: { ...where, removedAt: null },
          }),
          this.prisma.sellOffer.count({
            where: { ...where, removedAt: { not: null } },
          }),
          this.prisma.sellOffer.aggregate({
            where: { ...where, removedAt: null },
            _sum: { totalValue: true },
          }),
        ]);

        return {
          total,
          active,
          removed,
          totalValue: totalValue._sum.totalValue || 0,
        };
      },
      300, // 5 minutes cache
    );
  }
}

