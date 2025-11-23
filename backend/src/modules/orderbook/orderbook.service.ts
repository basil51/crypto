import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as WebSocket from 'ws';

export interface OrderbookSnapshot {
  symbol: string;
  exchange: string;
  bids: Array<[string, string]>; // [price, quantity]
  asks: Array<[string, string]>;
  timestamp: Date;
}

@Injectable()
export class OrderbookService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderbookService.name);
  private wsConnections: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Initialize WebSocket connections for supported exchanges
    // This is a placeholder - actual implementation would connect to Binance/KuCoin
    this.logger.log('Orderbook service initialized');
  }

  async onModuleDestroy() {
    // Close all WebSocket connections
    for (const [exchange, ws] of this.wsConnections.entries()) {
      ws.close();
    }
    this.wsConnections.clear();
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
  }

  /**
   * Get orderbook snapshot from cache or fetch fresh
   */
  async getOrderbook(
    symbol: string,
    exchange: string = 'binance',
  ): Promise<OrderbookSnapshot | null> {
    const cacheKey = `orderbook:${exchange}:${symbol}`;
    
    // Try to get from cache first
    const cached = await this.cacheService.get<OrderbookSnapshot>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from exchange API (placeholder)
    // In production, this would call Binance/KuCoin REST API or WebSocket
    return this.fetchOrderbookFromExchange(symbol, exchange);
  }

  /**
   * Fetch orderbook from exchange API
   */
  private async fetchOrderbookFromExchange(
    symbol: string,
    exchange: string,
  ): Promise<OrderbookSnapshot | null> {
    try {
      if (exchange === 'binance') {
        return this.fetchBinanceOrderbook(symbol);
      } else if (exchange === 'kucoin') {
        return this.fetchKuCoinOrderbook(symbol);
      } else {
        this.logger.warn(`Unsupported exchange: ${exchange}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error fetching orderbook: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch orderbook from Binance API
   * Public endpoint: https://api.binance.com/api/v3/depth
   * API key is optional but recommended for higher rate limits
   */
  private async fetchBinanceOrderbook(
    symbol: string,
    limit: number = 100,
  ): Promise<OrderbookSnapshot | null> {
    try {
      const url = `https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Optional: Add API key header if provided (for higher rate limits)
      const apiKey = this.configService.get<string>('BINANCE_API_KEY');
      if (apiKey) {
        headers['X-MBX-APIKEY'] = apiKey;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Binance API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();

      // Binance returns bids and asks as arrays of [price, quantity]
      const snapshot: OrderbookSnapshot = {
        symbol: symbol.toUpperCase(),
        exchange: 'binance',
        bids: data.bids || [],
        asks: data.asks || [],
        timestamp: new Date(),
      };

      // Cache the result
      const cacheKey = `orderbook:binance:${symbol.toUpperCase()}`;
      await this.cacheService.set(cacheKey, snapshot, 5); // 5 seconds TTL for orderbook data

      return snapshot;
    } catch (error) {
      this.logger.error(`Error fetching Binance orderbook: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch orderbook from KuCoin API
   * Public endpoint: https://api.kucoin.com/api/v1/market/orderbook/level2_100
   * API key is optional but recommended for higher rate limits
   */
  private async fetchKuCoinOrderbook(
    symbol: string,
  ): Promise<OrderbookSnapshot | null> {
    try {
      // KuCoin uses different symbol format (e.g., BTC-USDT instead of BTCUSDT)
      // Convert BTCUSDT -> BTC-USDT, ETHUSDT -> ETH-USDT, etc.
      let kucoinSymbol = symbol.toUpperCase();
      if (kucoinSymbol.endsWith('USDT') && !kucoinSymbol.includes('-')) {
        const base = kucoinSymbol.replace('USDT', '');
        kucoinSymbol = `${base}-USDT`;
      }
      
      const url = `https://api.kucoin.com/api/v1/market/orderbook/level2_100?symbol=${kucoinSymbol}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Optional: Add API key header if provided (for higher rate limits)
      const apiKey = this.configService.get<string>('KUCOIN_API_KEY');
      if (apiKey) {
        headers['KC-API-KEY'] = apiKey;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`KuCoin API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();

      if (data.code !== '200000' || !data.data) {
        this.logger.error(`KuCoin API error: ${data.msg || 'Unknown error'}`);
        return null;
      }

      // KuCoin returns bids and asks as arrays of [price, quantity]
      const snapshot: OrderbookSnapshot = {
        symbol: symbol.toUpperCase(),
        exchange: 'kucoin',
        bids: data.data.bids || [],
        asks: data.data.asks || [],
        timestamp: new Date(),
      };

      // Cache the result
      const cacheKey = `orderbook:kucoin:${symbol.toUpperCase()}`;
      await this.cacheService.set(cacheKey, snapshot, 5); // 5 seconds TTL

      return snapshot;
    } catch (error) {
      this.logger.error(`Error fetching KuCoin orderbook: ${error.message}`);
      return null;
    }
  }

  /**
   * Subscribe to orderbook updates via WebSocket
   */
  async subscribeToOrderbook(
    symbol: string,
    exchange: string = 'binance',
  ): Promise<void> {
    const key = `${exchange}:${symbol}`;
    
    if (this.wsConnections.has(key)) {
      this.logger.log(`Already subscribed to ${key}`);
      return;
    }

    // Placeholder: In production, this would establish WebSocket connection
    // Example: wss://stream.binance.com:9443/ws/btcusdt@depth
    this.logger.log(`Subscribing to orderbook updates for ${key}`);
    
    // Store connection (placeholder)
    // const ws = new WebSocket(...);
    // this.wsConnections.set(key, ws);
  }

  /**
   * Unsubscribe from orderbook updates
   */
  async unsubscribeFromOrderbook(
    symbol: string,
    exchange: string = 'binance',
  ): Promise<void> {
    const key = `${exchange}:${symbol}`;
    const ws = this.wsConnections.get(key);
    
    if (ws) {
      ws.close();
      this.wsConnections.delete(key);
      this.logger.log(`Unsubscribed from ${key}`);
    }
  }

  /**
   * Update orderbook snapshot in cache
   */
  async updateOrderbookSnapshot(snapshot: OrderbookSnapshot): Promise<void> {
    const cacheKey = `orderbook:${snapshot.exchange}:${snapshot.symbol}`;
    await this.cacheService.set(cacheKey, snapshot, 10); // 10 seconds TTL
  }

  /**
   * Get multiple orderbooks
   */
  async getMultipleOrderbooks(
    symbols: string[],
    exchange: string = 'binance',
  ): Promise<Map<string, OrderbookSnapshot>> {
    const orderbooks = new Map<string, OrderbookSnapshot>();
    
    for (const symbol of symbols) {
      const orderbook = await this.getOrderbook(symbol, exchange);
      if (orderbook) {
        orderbooks.set(symbol, orderbook);
      }
    }
    
    return orderbooks;
  }
}

