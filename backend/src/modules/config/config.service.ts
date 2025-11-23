import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Centralized configuration service for all detection and system thresholds
 * Makes it easy to tune parameters without code changes
 */
@Injectable()
export class ConfigThresholdService {
  constructor(private configService: NestConfigService) {}

  // Detection thresholds
  get signalThreshold(): number {
    return this.configService.get<number>('DETECTION_SIGNAL_THRESHOLD') || 60;
  }

  get whaleInflowThreshold(): number {
    return this.configService.get<number>('DETECTION_WHALE_THRESHOLD') || 80;
  }

  get concentratedBuysThreshold(): number {
    return this.configService.get<number>('DETECTION_CONCENTRATED_THRESHOLD') || 70;
  }

  // Sell wall thresholds
  get sellWallThreshold(): number {
    return this.configService.get<number>('SELL_WALL_THRESHOLD') || 50000; // $50k USD
  }

  get sellWallPriceRange(): number {
    return this.configService.get<number>('SELL_WALL_PRICE_RANGE') || 0.02; // 2%
  }

  // Whale detection thresholds
  get whaleBuyThreshold(): number {
    return this.configService.get<number>('WHALE_BUY_THRESHOLD') || 100000; // $100k USD
  }

  get whaleSellThreshold(): number {
    return this.configService.get<number>('WHALE_SELL_THRESHOLD') || 100000; // $100k USD
  }

  // Exchange flow thresholds
  get exchangeDepositThreshold(): number {
    return this.configService.get<number>('EXCHANGE_DEPOSIT_THRESHOLD') || 50000; // $50k USD
  }

  get exchangeWithdrawalThreshold(): number {
    return this.configService.get<number>('EXCHANGE_WITHDRAWAL_THRESHOLD') || 50000; // $50k USD
  }

  // Token breakout thresholds
  get breakoutVolumeThreshold(): number {
    return this.configService.get<number>('BREAKOUT_VOLUME_THRESHOLD') || 2.0; // 2x average volume
  }

  get breakoutPriceChangeThreshold(): number {
    return this.configService.get<number>('BREAKOUT_PRICE_CHANGE_THRESHOLD') || 0.15; // 15% price change
  }

  /**
   * Get all thresholds as an object (useful for admin UI)
   */
  getAllThresholds() {
    return {
      detection: {
        signalThreshold: this.signalThreshold,
        whaleInflowThreshold: this.whaleInflowThreshold,
        concentratedBuysThreshold: this.concentratedBuysThreshold,
      },
      sellWall: {
        threshold: this.sellWallThreshold,
        priceRange: this.sellWallPriceRange,
      },
      whale: {
        buyThreshold: this.whaleBuyThreshold,
        sellThreshold: this.whaleSellThreshold,
      },
      exchange: {
        depositThreshold: this.exchangeDepositThreshold,
        withdrawalThreshold: this.exchangeWithdrawalThreshold,
      },
      breakout: {
        volumeThreshold: this.breakoutVolumeThreshold,
        priceChangeThreshold: this.breakoutPriceChangeThreshold,
      },
    };
  }
}

