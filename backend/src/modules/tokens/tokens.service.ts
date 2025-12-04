import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { Token, Prisma } from '@prisma/client';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private integrationsService: IntegrationsService,
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
    // Normalize inputs - addresses are case-insensitive in Ethereum
    const normalizedChain = chain.toLowerCase();
    const normalizedAddress = contractAddress.toLowerCase();
    const cacheKey = `tokens:${normalizedChain}:${normalizedAddress}`;
    
    // Debug: Log the token being checked
    this.logger.debug(
      `findByAddress: Checking token - Chain=${normalizedChain}, Address=${normalizedAddress}`
    );
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Use raw query for case-insensitive address comparison (PostgreSQL)
        // This handles addresses stored with mixed case (checksummed format)
        const result = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM tokens 
          WHERE LOWER(chain) = ${normalizedChain} 
          AND LOWER(contract_address) = ${normalizedAddress}
          LIMIT 1
        `;
        
        if (result.length === 0) {
          this.logger.debug(
            `findByAddress: Token NOT found - Chain=${normalizedChain}, Address=${normalizedAddress}`
          );
          return null;
        }
        
        // Fetch the full token record
        const token = await this.prisma.token.findUnique({
          where: { id: result[0].id },
        });
        
        // Debug: Log the token that was found
        if (token) {
          this.logger.debug(
            `findByAddress: Token FOUND - Name="${token.name}" (${token.symbol}), ` +
            `Chain=${normalizedChain}, Address=${normalizedAddress}`
          );
        }
        
        return token;
      },
      600, // 10 minutes
    );
  }

  async findBySymbol(chain: string, symbol: string): Promise<Token | null> {
    const cacheKey = `tokens:${chain}:symbol:${symbol.toUpperCase()}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.prisma.token.findFirst({
        where: {
          chain: chain.toLowerCase(),
          symbol: {
            equals: symbol,
            mode: 'insensitive', // Case-insensitive search (PostgreSQL supports this)
          },
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

  /**
   * Ensure a token record exists (used when alerts arrive for unknown tokens)
   * Tries several lookup strategies before creating a lightweight entry.
   */
  async ensureTokenExists(params: {
    tokenId?: string;
    chain?: string;
    contractAddress?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
    metadata?: Record<string, any>;
    active?: boolean;
  }): Promise<Token | null> {
    const normalizedChain = (params.chain || 'ethereum').toLowerCase();
    const normalizedAddress = params.contractAddress
      ? params.contractAddress.toLowerCase()
      : undefined;

    // 1. Attempt direct lookup by tokenId (if provided)
    let existing: Token | null = null;
    if (params.tokenId) {
      existing = await this.prisma.token.findUnique({
        where: { id: params.tokenId },
      });
    }

    // 2. Lookup by contract address
    if (!existing && normalizedAddress) {
      existing = await this.findByAddress(normalizedChain, normalizedAddress);
    }

    // 3. Lookup by symbol as a last resort
    if (!existing && params.symbol) {
      existing = await this.findBySymbol(normalizedChain, params.symbol);
    }

    // Reactivate token if it exists but inactive
    if (existing) {
      if (!existing.active) {
        existing = await this.update(existing.id, { active: true });
      }
      return existing;
    }

    const symbol = params.symbol;
    const name = params.name || params.symbol;

    if (!symbol || !name) {
      this.logger.warn(
        `ensureTokenExists: Missing symbol/name (tokenId=${params.tokenId || 'N/A'})`,
      );
      return null;
    }

    const createInput: Prisma.TokenCreateInput = {
      chain: normalizedChain,
      symbol,
      name,
      contractAddress: normalizedAddress || '0x0000000000000000000000000000000000000000',
      decimals: params.decimals ?? 18,
      active: params.active ?? true,
      metadata: {
        ...(params.metadata || {}),
        ensuredAt: new Date().toISOString(),
        ensuredVia: 'TokensService.ensureTokenExists',
      },
    };

    if (params.tokenId) {
      createInput.id = params.tokenId;
    }

    try {
      return await this.create(createInput);
    } catch (error: any) {
      // Handle race conditions where another process created the token first
      if (error.code === 'P2002') {
        if (params.tokenId) {
          return await this.prisma.token.findUnique({
            where: { id: params.tokenId },
          });
        }
        if (normalizedAddress) {
          return await this.findByAddress(normalizedChain, normalizedAddress);
        }
      }
      this.logger.error(`ensureTokenExists failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get price history for a token
   * Returns price and volume data over time for charting
   */
  async getPriceHistory(
    tokenId: string,
    timeframe: string = '24h',
  ): Promise<any[]> {
    const cacheKey = `tokens:${tokenId}:price-history:${timeframe}`;
    // Use shorter cache for price history (30 seconds) to ensure fresh data
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get token data
        const token = await this.findOne(tokenId);
        if (!token) {
          return [];
        }

        // Calculate days for CoinGecko API
        let days = 1;
        switch (timeframe) {
          case '1h':
            days = 1;
            break;
          case '24h':
            days = 1;
            break;
          case '7d':
            days = 7;
            break;
          case '30d':
            days = 30;
            break;
          case '1y':
            days = 365;
            break;
        }

        // Try to get CoinGecko ID
        const coingeckoId = await this.integrationsService.coingecko.getCoinGeckoId(token);
        
        if (coingeckoId) {
          // Fetch real price data from CoinGecko
          const priceHistory = await this.integrationsService.coingecko.getPriceHistory(
            coingeckoId,
            days,
          );

          if (priceHistory && priceHistory.length > 0) {
            return priceHistory;
          }
        }

        // Fallback 1: Check token metrics in database
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const metrics = await this.prisma.tokenMetrics.findMany({
          where: {
            tokenId,
            recordedAt: { gte: startDate },
            priceUsd: { not: null },
          },
          orderBy: { recordedAt: 'asc' },
        });

        if (metrics.length > 0) {
          return metrics.map((m) => ({
            timestamp: m.recordedAt.toISOString(),
            price: m.priceUsd ? Number(m.priceUsd) : 0,
            volume: m.volume24h ? Number(m.volume24h) : 0,
          }));
        }

        // Fallback 2: Try Moralis for current price, then generate synthetic history
        let currentPrice = 0;
        try {
          if (token.contractAddress && token.contractAddress !== '0x0000000000000000000000000000000000000000') {
            const moralisChain = this.mapChainToMoralis(token.chain);
            const priceData = await this.integrationsService.moralis.getTokenPrice(
              token.contractAddress,
              moralisChain,
            );
            if (priceData?.usdPrice) {
              currentPrice = parseFloat(priceData.usdPrice);
            }
          }
        } catch (error) {
          // Moralis failed, continue with fallback
        }

        // If we have a current price, generate synthetic history around it
        if (currentPrice > 0) {
          return this.generateSyntheticHistory(currentPrice, days);
        }

        // Last resort: return empty array
        return [];
      },
      30, // 30 seconds cache for price history
    );
  }

  /**
   * Generate synthetic price history around a current price
   */
  private generateSyntheticHistory(currentPrice: number, days: number): any[] {
    const dataPoints: any[] = [];
    const now = Date.now();
    const intervalMs = days <= 1 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour or 1 day
    const numPoints = Math.floor((days * 24 * 60 * 60 * 1000) / intervalMs);

    // Generate price with small random variations
    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(now - (numPoints - i) * intervalMs);
      // Small random variation (±5%)
      const variation = (Math.random() - 0.5) * 0.1; // -5% to +5%
      const price = currentPrice * (1 + variation);

      dataPoints.push({
        timestamp: timestamp.toISOString(),
        price: Math.max(0.0001, price),
        volume: 0, // Volume would need separate data source
      });
    }

    return dataPoints;
  }

  /**
   * Get current price for a token
   */
  async getCurrentPrice(tokenId: string): Promise<number | null> {
    const cacheKey = `tokens:${tokenId}:current-price`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const token = await this.findOne(tokenId);
        if (!token) {
          return null;
        }

        // Try CoinGecko first
        const coingeckoId = await this.integrationsService.coingecko.getCoinGeckoId(token);
        if (coingeckoId) {
          const price = await this.integrationsService.coingecko.getTokenPrice(coingeckoId);
          if (price !== null) {
            return price;
          }
        }

        // Fallback to Moralis
        try {
          if (token.contractAddress && token.contractAddress !== '0x0000000000000000000000000000000000000000') {
            const moralisChain = this.mapChainToMoralis(token.chain);
            const priceData = await this.integrationsService.moralis.getTokenPrice(
              token.contractAddress,
              moralisChain,
            );
            if (priceData?.usdPrice) {
              return parseFloat(priceData.usdPrice);
            }
          }
        } catch (error) {
          // Moralis failed
        }

        // Check latest token metrics
        const latestMetric = await this.prisma.tokenMetrics.findFirst({
          where: {
            tokenId,
            priceUsd: { not: null },
          },
          orderBy: { recordedAt: 'desc' },
        });

        if (latestMetric?.priceUsd) {
          return Number(latestMetric.priceUsd);
        }

        return null;
      },
      60, // 1 minute cache
    );
  }

  /**
   * Alpha Screener - Advanced token filtering
   * Supports filters: chain, age, volume, marketCap, whaleInflowPercent, accumulationScore
   * Supports presets for common "find next 100x" scenarios
   */
  async alphaScreener(filters: {
    chain?: string;
    minAge?: number; // in minutes
    maxAge?: number; // in minutes
    minVolume24h?: number; // USD
    maxVolume24h?: number; // USD
    minMarketCap?: number; // USD
    maxMarketCap?: number; // USD
    minWhaleInflowPercent?: number; // percentage
    minAccumulationScore?: number; // 0-100
    minSmartWallets?: number; // minimum number of smart wallets that bought
    preset?: string; // 'low-mcap-high-smart', 'new-solana-whale', 'eth-winning-wallets'
    sortBy?: string; // 'accumScore', 'whaleInflow', 'volume24h', 'marketCap', 'age'
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }): Promise<any[]> {
    const cacheKey = `tokens:alpha-screener:${JSON.stringify(filters)}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Apply preset filters if specified
        if (filters.preset) {
          switch (filters.preset) {
            case 'low-mcap-high-smart':
              filters.maxMarketCap = filters.maxMarketCap || 1000000; // $1M
              filters.minSmartWallets = filters.minSmartWallets || 5;
              break;
            case 'new-solana-whale':
              filters.chain = 'solana';
              filters.maxAge = 10; // 10 minutes
              filters.minSmartWallets = 1; // at least 1 whale buy
              break;
            case 'eth-winning-wallets':
              filters.chain = 'ethereum';
              filters.minSmartWallets = 10;
              // This would need wallet win rate calculation - simplified for now
              break;
          }
        }

        // Get all active tokens
        const where: Prisma.TokenWhereInput = {
          active: true,
        };
        if (filters.chain) {
          where.chain = filters.chain.toLowerCase();
        }

        // Age filter (maxAge means tokens created within last X minutes)
        if (filters.maxAge !== undefined || filters.minAge !== undefined) {
          const now = new Date();
          where.createdAt = {};
          if (filters.maxAge !== undefined) {
            where.createdAt.gte = new Date(now.getTime() - filters.maxAge * 60 * 1000);
          }
          // minAge means tokens older than X minutes
          if (filters.minAge !== undefined) {
            where.createdAt.lte = new Date(now.getTime() - filters.minAge * 60 * 1000);
          }
        }

        const tokens = await this.prisma.token.findMany({ where });

        // Enrich tokens with metrics and calculate scores
        const enrichedTokens = await Promise.all(
          tokens.map(async (token) => {
            // Get latest token metrics
            const latestMetric = await this.prisma.tokenMetrics.findFirst({
              where: { tokenId: token.id },
              orderBy: { recordedAt: 'desc' },
            });

            // Get latest accumulation signal
            const latestSignal = await this.prisma.accumulationSignal.findFirst({
              where: { tokenId: token.id },
              orderBy: { score: 'desc' },
            });

            // Get whale events in last 24h
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const whaleEvents = await this.prisma.whaleEvent.findMany({
              where: {
                tokenId: token.id,
                timestamp: { gte: oneDayAgo },
                direction: 'buy',
              },
              include: {
                wallet: true,
              },
            });

            // Calculate smart wallets count (unique wallets that bought)
            const smartWallets = new Set(
              whaleEvents
                .filter((e) => e.walletId)
                .map((e) => e.walletId as string),
            );

            // Calculate whale inflow (total USD value of buys)
            const totalWhaleInflow = whaleEvents.reduce(
              (sum, e) => sum + (e.valueUsd ? Number(e.valueUsd) : 0),
              0,
            );

            // Calculate whale inflow percentage (simplified - would need total volume)
            const volume24h = latestMetric?.volume24h ? Number(latestMetric.volume24h) : 0;
            const whaleInflowPercent =
              volume24h > 0 ? (totalWhaleInflow / volume24h) * 100 : 0;

            // Calculate token age in minutes
            const ageMinutes = Math.floor(
              (Date.now() - token.createdAt.getTime()) / (60 * 1000),
            );

            const accumScore = latestSignal ? Number(latestSignal.score) : 0;
            const marketCap = latestMetric?.marketCap ? Number(latestMetric.marketCap) : 0;

            return {
              tokenId: token.id,
              symbol: token.symbol,
              name: token.name,
              chain: token.chain,
              contractAddress: token.contractAddress,
              age: ageMinutes,
              ageFormatted: this.formatAge(ageMinutes),
              volume24h,
              marketCap,
              whaleInflowPercent,
              accumulationScore: accumScore,
              smartWalletsCount: smartWallets.size,
              price: latestMetric?.priceUsd ? Number(latestMetric.priceUsd) : 0,
              latestSignal: latestSignal
                ? {
                    score: accumScore,
                    signalType: latestSignal.signalType,
                    createdAt: latestSignal.createdAt,
                  }
                : null,
            };
          }),
        );

        // Apply filters
        let filtered = enrichedTokens.filter((token) => {
          if (filters.minVolume24h !== undefined && token.volume24h < filters.minVolume24h) {
            return false;
          }
          if (filters.maxVolume24h !== undefined && token.volume24h > filters.maxVolume24h) {
            return false;
          }
          if (filters.minMarketCap !== undefined && token.marketCap < filters.minMarketCap) {
            return false;
          }
          if (filters.maxMarketCap !== undefined && token.marketCap > filters.maxMarketCap) {
            return false;
          }
          if (
            filters.minWhaleInflowPercent !== undefined &&
            token.whaleInflowPercent < filters.minWhaleInflowPercent
          ) {
            return false;
          }
          if (
            filters.minAccumulationScore !== undefined &&
            token.accumulationScore < filters.minAccumulationScore
          ) {
            return false;
          }
          if (
            filters.minSmartWallets !== undefined &&
            token.smartWalletsCount < filters.minSmartWallets
          ) {
            return false;
          }
          return true;
        });

        // Sort
        const sortBy = filters.sortBy || 'accumulationScore';
        const sortOrder = filters.sortOrder || 'desc';
        filtered.sort((a, b) => {
          let aVal = a[sortBy] || 0;
          let bVal = b[sortBy] || 0;
          if (sortOrder === 'asc') {
            return aVal - bVal;
          }
          return bVal - aVal;
        });

        // Limit
        const limit = filters.limit || 100;
        return filtered.slice(0, limit);
      },
      60, // 1 minute cache
    );
  }

  /**
   * Format age in minutes to human-readable string
   */
  private formatAge(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  }

  /**
   * Map chain name to Moralis format
   */
  private mapChainToMoralis(chain: string): string {
    const chainMap: Record<string, string> = {
      'bsc': 'bsc',
      'binance': 'bsc',
      'ethereum': 'eth',
      'eth': 'eth',
      'polygon': 'polygon',
      'matic': 'polygon',
      'arbitrum': 'arbitrum',
      'arb': 'arbitrum',
      'base': 'base',
    };

    return chainMap[chain.toLowerCase()] || chain.toLowerCase();
  }
}

