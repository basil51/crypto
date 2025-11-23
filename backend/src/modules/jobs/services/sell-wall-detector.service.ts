import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderbookService } from '../../orderbook/orderbook.service';
import { CacheService } from '../../../common/cache/cache.service';
import { EnhancedAlertTriggerService } from '../../alerts/services/enhanced-alert-trigger.service';

@Injectable()
export class SellWallDetectorService {
  private readonly logger = new Logger(SellWallDetectorService.name);
  private readonly SELL_WALL_THRESHOLD: number;
  private readonly WALL_PRICE_RANGE: number;

  constructor(
    private prisma: PrismaService,
    private orderbookService: OrderbookService,
    private cacheService: CacheService,
    private alertTrigger: EnhancedAlertTriggerService,
    private configService: ConfigService,
  ) {
    // Load thresholds from environment or use defaults
    this.SELL_WALL_THRESHOLD = this.configService.get<number>('SELL_WALL_THRESHOLD') || 50000; // $50k USD equivalent
    this.WALL_PRICE_RANGE = this.configService.get<number>('SELL_WALL_PRICE_RANGE') || 0.02; // 2% price range
    
    this.logger.log(
      `Sell wall detection thresholds: Threshold=${this.SELL_WALL_THRESHOLD}, PriceRange=${this.WALL_PRICE_RANGE}`
    );
  }

  /**
   * Run sell wall detection every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectSellWalls() {
    this.logger.log('Running sell wall detection...');

    try {
      // Get active tokens
      const tokens = await this.prisma.token.findMany({
        where: { active: true },
        take: 50, // Limit to top 50 tokens for now
      });

      for (const token of tokens) {
        try {
          // Get symbol for exchange (e.g., BTCUSDT)
          const exchangeSymbol = this.getExchangeSymbol(token.symbol);
          if (!exchangeSymbol) continue;

          // Get orderbook for this token
          const orderbook = await this.orderbookService.getOrderbook(
            exchangeSymbol,
            'binance',
          );

          if (!orderbook || !orderbook.asks || orderbook.asks.length === 0) {
            continue;
          }

          // Detect sell walls
          const sellWalls = this.analyzeSellWalls(orderbook, token.id);

          // Save detected walls with actual token symbol
          for (const wall of sellWalls) {
            await this.saveSellWall(wall, token, exchangeSymbol, 'binance');
          }

          // Check for removed walls
          await this.checkRemovedWalls(token.symbol, sellWalls);
        } catch (error) {
          this.logger.error(
            `Error detecting sell walls for token ${token.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Sell wall detection completed');
    } catch (error) {
      this.logger.error(`Error in sell wall detection: ${error.message}`);
    }
  }

  /**
   * Analyze orderbook asks to detect sell walls
   */
  private analyzeSellWalls(
    orderbook: any,
    tokenId: string,
  ): Array<{
    price: number;
    quantity: number;
    totalValue: number;
    priceRange: [number, number];
  }> {
    const walls: Array<{
      price: number;
      quantity: number;
      totalValue: number;
      priceRange: [number, number];
    }> = [];

    if (!orderbook.asks || orderbook.asks.length === 0) {
      return walls;
    }

    // Group asks by price ranges
    const priceGroups = new Map<string, { price: number; quantity: number }[]>();

    for (const [priceStr, quantityStr] of orderbook.asks) {
      const price = parseFloat(priceStr);
      const quantity = parseFloat(quantityStr);
      const value = price * quantity;

      // Skip if below threshold
      if (value < this.SELL_WALL_THRESHOLD) {
        continue;
      }

      // Find price group (within 2% range)
      let foundGroup = false;
      for (const [groupKey] of priceGroups.entries()) {
        const groupPrice = parseFloat(groupKey);
        if (Math.abs(price - groupPrice) / groupPrice <= this.WALL_PRICE_RANGE) {
          priceGroups.get(groupKey)!.push({ price, quantity });
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        priceGroups.set(priceStr, [{ price, quantity }]);
      }
    }

    // Calculate total value for each group and identify walls
    for (const [groupPriceStr, asks] of priceGroups.entries()) {
      const totalQuantity = asks.reduce((sum, a) => sum + a.quantity, 0);
      const avgPrice = asks.reduce((sum, a) => sum + a.price * a.quantity, 0) / totalQuantity;
      const totalValue = avgPrice * totalQuantity;

      if (totalValue >= this.SELL_WALL_THRESHOLD) {
        const minPrice = Math.min(...asks.map((a) => a.price));
        const maxPrice = Math.max(...asks.map((a) => a.price));

        walls.push({
          price: avgPrice,
          quantity: totalQuantity,
          totalValue,
          priceRange: [minPrice, maxPrice],
        });
      }
    }

    return walls;
  }

  /**
   * Save detected sell wall to database
   */
  private async saveSellWall(
    wall: {
      price: number;
      quantity: number;
      totalValue: number;
      priceRange: [number, number];
    },
    token: { id: string; symbol: string; name: string },
    exchangeSymbol: string,
    exchange: string,
  ): Promise<void> {
    // Check if wall already exists (within same price range)
    const existing = await this.prisma.sellOffer.findFirst({
      where: {
        exchange,
        symbol: exchangeSymbol,
        price: {
          gte: wall.priceRange[0],
          lte: wall.priceRange[1],
        },
        removedAt: null,
      },
    });

    if (existing) {
      // Update existing wall
      await this.prisma.sellOffer.update({
        where: { id: existing.id },
        data: {
          price: wall.price,
          quantity: wall.quantity,
          totalValue: wall.totalValue,
          metadata: {
            priceRange: wall.priceRange,
            updatedAt: new Date(),
            tokenId: token.id,
            tokenSymbol: token.symbol,
            tokenName: token.name,
          },
        },
      });
    } else {
      // Create new wall
      const newWall = await this.prisma.sellOffer.create({
        data: {
          exchange,
          symbol: exchangeSymbol, // Store exchange symbol (e.g., BTCUSDT)
          price: wall.price,
          quantity: wall.quantity,
          totalValue: wall.totalValue,
          wallType: 'sell_wall',
          metadata: {
            priceRange: wall.priceRange,
            tokenId: token.id,
            tokenSymbol: token.symbol,
            tokenName: token.name,
          },
        },
      });

      // Trigger sell wall created alert
      try {
        await this.alertTrigger.triggerSellWallCreatedAlert(
          token.id,
          newWall.id,
          Number(wall.quantity),
          wall.price,
          exchange,
          {
            totalValue: wall.totalValue,
            priceRange: wall.priceRange,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to trigger sell wall alert: ${error.message}`);
      }
    }
  }

  /**
   * Check for removed walls (walls that no longer exist)
   */
  private async checkRemovedWalls(
    tokenSymbol: string,
    currentWalls: Array<{ price: number; priceRange: [number, number] }>,
  ): Promise<void> {
    // Get exchange symbol for this token
    const exchangeSymbol = this.getExchangeSymbol(tokenSymbol);
    if (!exchangeSymbol) return;

    // Get active walls from database
    const activeWalls = await this.prisma.sellOffer.findMany({
      where: {
        symbol: exchangeSymbol,
        removedAt: null,
      },
    });

    // Mark walls as removed if they're not in current detection
    for (const wall of activeWalls) {
      const wallPrice = Number(wall.price);
      const stillExists = currentWalls.some(
        (cw) =>
          wallPrice >= cw.priceRange[0] && wallPrice <= cw.priceRange[1],
      );

      if (!stillExists) {
        await this.prisma.sellOffer.update({
          where: { id: wall.id },
          data: { removedAt: new Date() },
        });

        // Trigger sell wall removed alert
        const tokenId = (wall.metadata as any)?.tokenId;
        if (tokenId) {
          try {
            await this.alertTrigger.triggerSellWallRemovedAlert(
              tokenId,
              wall.id,
              {
                price: Number(wall.price),
                quantity: Number(wall.quantity),
                totalValue: Number(wall.totalValue),
              },
            );
          } catch (error) {
            this.logger.warn(`Failed to trigger sell wall removed alert: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Convert token symbol to exchange symbol format
   */
  private getExchangeSymbol(symbol: string): string | null {
    // Placeholder: Convert token symbol to exchange trading pair
    // Example: "BTC" -> "BTCUSDT"
    // In production, this would use a mapping or token metadata
    return `${symbol.toUpperCase()}USDT`;
  }
}

