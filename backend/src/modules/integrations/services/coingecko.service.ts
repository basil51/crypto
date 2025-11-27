import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly baseURL = 'https://api.coingecko.com/api/v3';
  private readonly client: AxiosInstance;
  private readonly apiKey: string | null;
  private apiKeyValid: boolean = true; // Track if API key is valid

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('COINGECKO_API_KEY') || null;
    
    // CoinGecko free tier doesn't require API key
    // Only add header if API key is provided and valid
    const headers: Record<string, string> = {};
    if (this.apiKey && this.apiKey.trim().length > 0 && this.apiKeyValid) {
      // Use appropriate header based on API key type
      // Demo API keys use 'x-cg-demo-api-key', Pro API keys use 'x-cg-pro-api-key'
      headers['x-cg-demo-api-key'] = this.apiKey.trim();
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers,
      timeout: 30000,
    });
  }

  /**
   * Get a client without API key (for free tier)
   */
  private getFreeTierClient(): AxiosInstance {
    return axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });
  }

  /**
   * Get current price for a token by CoinGecko ID
   */
  async getTokenPrice(coingeckoId: string): Promise<number | null> {
    try {
      const response = await this.client.get(`/simple/price`, {
        params: {
          ids: coingeckoId,
          vs_currencies: 'usd',
        },
      });

      if (response.data && response.data[coingeckoId]?.usd) {
        return response.data[coingeckoId].usd;
      }
      return null;
    } catch (error: any) {
      // Handle 401 - retry without API key if we were using one
      if (error.response?.status === 401 && this.apiKey) {
        this.logger.warn(`CoinGecko API returned 401 for ${coingeckoId}, retrying without API key`);
        this.apiKeyValid = false; // Mark API key as invalid
        try {
          const retryResponse = await this.getFreeTierClient().get(`/simple/price`, {
            params: {
              ids: coingeckoId,
              vs_currencies: 'usd',
            },
          });
          if (retryResponse.data && retryResponse.data[coingeckoId]?.usd) {
            this.logger.log(`Retry successful for ${coingeckoId} using free tier`);
            return retryResponse.data[coingeckoId].usd;
          }
        } catch (retryError: any) {
          this.logger.warn(`Retry also failed for ${coingeckoId}: ${retryError.message}`);
        }
      }
      
      this.logger.warn(`Failed to get price for ${coingeckoId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get price history (OHLC data) for a token
   */
  async getPriceHistory(
    coingeckoId: string,
    days: number = 1,
  ): Promise<Array<{ timestamp: string; price: number; volume: number }>> {
    try {
      // CoinGecko free tier: Don't specify interval parameter
      // - For days = 1: Returns data every ~5 minutes (automatic)
      // - For days 2-90: Returns hourly data automatically (no interval param needed)
      // - For days > 90: Returns daily data automatically
      // Enterprise tier can use 'hourly' or 'daily' interval parameter
      
      const params: any = {
        vs_currency: 'usd',
        days,
      };
      
      // Only add interval parameter if we have a valid Enterprise API key
      // For free tier, CoinGecko automatically determines interval based on days
      if (this.apiKey && this.apiKeyValid && days <= 1) {
        // Enterprise plan can use hourly for 1 day
        params.interval = 'hourly';
      } else if (this.apiKey && this.apiKeyValid && days > 1 && days <= 90) {
        // Enterprise plan can specify interval for 2-90 days
        params.interval = 'hourly';
      } else if (this.apiKey && this.apiKeyValid && days > 90) {
        params.interval = 'daily';
      }
      // For free tier, don't add interval parameter - let CoinGecko auto-determine
      
      const response = await this.client.get(`/coins/${coingeckoId}/market_chart`, {
        params,
      });

      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];

      this.logger.debug(
        `CoinGecko returned ${prices.length} price points and ${volumes.length} volume points for ${coingeckoId} (${days} days)`,
      );

      if (prices.length === 0) {
        this.logger.warn(`No price data returned from CoinGecko for ${coingeckoId}`);
        return [];
      }

      // Create maps with exact timestamps (don't round - that was causing data loss)
      const priceMap = new Map<number, number>();
      prices.forEach(([timestamp, price]: [number, number]) => {
        if (timestamp && price && !isNaN(price) && price > 0) {
          priceMap.set(timestamp, price);
        }
      });

      const volumeMap = new Map<number, number>();
      volumes.forEach(([timestamp, volume]: [number, number]) => {
        if (timestamp && volume && !isNaN(volume)) {
          volumeMap.set(timestamp, volume);
        }
      });

      // Get all unique timestamps from prices (primary) and sort them
      const sortedTimestamps = Array.from(priceMap.keys()).sort((a, b) => a - b);

      if (sortedTimestamps.length === 0) {
        this.logger.warn(`No valid price timestamps found for ${coingeckoId}`);
        return [];
      }

      // Combine prices and volumes, using the closest volume if exact match not found
      const result: Array<{ timestamp: string; price: number; volume: number }> = [];
      
      for (const timestamp of sortedTimestamps) {
        const price = priceMap.get(timestamp);
        let volume = volumeMap.get(timestamp);
        
        // If no exact volume match, find the closest one within reasonable time window
        if (volume === undefined && volumeMap.size > 0) {
          const volumeTimestamps = Array.from(volumeMap.keys()).sort((a, b) => a - b);
          const timeWindow = days <= 1 ? 30 * 60 * 1000 : days <= 7 ? 60 * 60 * 1000 : 4 * 60 * 60 * 1000; // 30min, 1h, or 4h
          
          const closestVolumeTime = volumeTimestamps.reduce((prev, curr) => {
            return Math.abs(curr - timestamp) < Math.abs(prev - timestamp) ? curr : prev;
          });
          
          // Only use if within time window
          if (Math.abs(closestVolumeTime - timestamp) < timeWindow) {
            volume = volumeMap.get(closestVolumeTime);
          }
        }

        if (price !== undefined && price > 0) {
          result.push({
            timestamp: new Date(timestamp).toISOString(),
            price: price,
            volume: volume || 0,
          });
        }
      }

      this.logger.debug(`Processed ${result.length} data points for ${coingeckoId} (expected ~${days * (days <= 1 ? 24 : days <= 7 ? 24 : 1)} points)`);
      
      // Validate we have enough data points
      const expectedMinPoints = days <= 1 ? 12 : days <= 7 ? 7 : days <= 30 ? 15 : 30;
      if (result.length < expectedMinPoints) {
        this.logger.warn(
          `Only received ${result.length} data points for ${coingeckoId} over ${days} days (expected at least ${expectedMinPoints}). This might be a CoinGecko API limitation.`,
        );
      }
      
      return result;
    } catch (error: any) {
      // Handle 401 specifically - might be invalid API key or rate limit
      if (error.response?.status === 401) {
        this.logger.warn(
          `CoinGecko API returned 401 for ${coingeckoId}. This might be due to an invalid API key or rate limiting. ` +
          `If using free tier, ensure COINGECKO_API_KEY is not set or is empty.`,
        );
        // Retry without API key if we were using one
        if (this.apiKey) {
          this.logger.log(`Retrying without API key for ${coingeckoId}`);
          this.apiKeyValid = false; // Mark API key as invalid
          try {
            // Free tier: Don't specify interval parameter - CoinGecko auto-determines it
            const retryResponse = await this.getFreeTierClient().get(`/coins/${coingeckoId}/market_chart`, {
              params: {
                vs_currency: 'usd',
                days,
                // No interval parameter for free tier
              },
            });
            // Process retry response the same way
            const prices = retryResponse.data.prices || [];
            const volumes = retryResponse.data.total_volumes || [];
            
            if (prices.length === 0) {
              this.logger.warn(`Retry returned no price data for ${coingeckoId}`);
              return [];
            }

            const priceMap = new Map<number, number>();
            prices.forEach(([timestamp, price]: [number, number]) => {
              if (timestamp && price && !isNaN(price) && price > 0) {
                priceMap.set(timestamp, price);
              }
            });

            const volumeMap = new Map<number, number>();
            volumes.forEach(([timestamp, volume]: [number, number]) => {
              if (timestamp && volume && !isNaN(volume)) {
                volumeMap.set(timestamp, volume);
              }
            });

            const sortedTimestamps = Array.from(priceMap.keys()).sort((a, b) => a - b);
            
            if (sortedTimestamps.length === 0) {
              this.logger.warn(`Retry returned no valid price timestamps for ${coingeckoId}`);
              return [];
            }

            const result: Array<{ timestamp: string; price: number; volume: number }> = [];
            
            for (const timestamp of sortedTimestamps) {
              const price = priceMap.get(timestamp);
              let volume = volumeMap.get(timestamp);
              
              if (volume === undefined && volumeMap.size > 0) {
                const volumeTimestamps = Array.from(volumeMap.keys()).sort((a, b) => a - b);
                const timeWindow = days <= 1 ? 30 * 60 * 1000 : days <= 7 ? 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
                
                const closestVolumeTime = volumeTimestamps.reduce((prev, curr) => {
                  return Math.abs(curr - timestamp) < Math.abs(prev - timestamp) ? curr : prev;
                });
                
                if (Math.abs(closestVolumeTime - timestamp) < timeWindow) {
                  volume = volumeMap.get(closestVolumeTime);
                }
              }

              if (price !== undefined && price > 0) {
                result.push({
                  timestamp: new Date(timestamp).toISOString(),
                  price: price,
                  volume: volume || 0,
                });
              }
            }
            
            this.logger.log(`Retry successful: Processed ${result.length} data points for ${coingeckoId}`);
            return result;
          } catch (retryError: any) {
            this.logger.error(`Retry also failed for ${coingeckoId}: ${retryError.message}`, retryError.stack);
            // Fall through to return empty array
          }
        }
      }
      
      this.logger.warn(`Failed to get price history for ${coingeckoId}: ${error.message}`);
      if (error.response) {
        this.logger.debug(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  /**
   * Search for token by symbol and chain
   * Returns CoinGecko ID if found
   */
  async searchToken(symbol: string, chain?: string): Promise<string | null> {
    try {
      // Map chain names to CoinGecko format
      const chainMap: Record<string, string> = {
        'bsc': 'binance-smart-chain',
        'binance': 'binance-smart-chain',
        'ethereum': 'ethereum',
        'eth': 'ethereum',
        'polygon': 'polygon-pos',
        'matic': 'polygon-pos',
        'arbitrum': 'arbitrum-one',
        'arb': 'arbitrum-one',
        'base': 'base',
        'solana': 'solana',
        'sol': 'solana',
      };

      const searchQuery = symbol.toLowerCase();
      const response = await this.client.get('/search', {
        params: {
          query: searchQuery,
        },
      });

      if (response.data?.coins && response.data.coins.length > 0) {
        // If chain is specified, try to match by chain
        if (chain) {
          const chainName = chainMap[chain.toLowerCase()] || chain.toLowerCase();
          const match = response.data.coins.find((coin: any) => 
            coin.symbol.toLowerCase() === searchQuery &&
            (coin.platforms && Object.keys(coin.platforms).some(p => 
              p.toLowerCase().includes(chainName)
            ))
          );
          if (match) return match.id;
        }

        // Otherwise, return the first match
        return response.data.coins[0].id;
      }

      return null;
    } catch (error: any) {
      this.logger.warn(`Failed to search token ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get CoinGecko ID from token metadata or search
   */
  async getCoinGeckoId(token: any): Promise<string | null> {
    // First, check if token has coingeckoId in metadata
    if (token.metadata && typeof token.metadata === 'object' && token.metadata.coingeckoId) {
      return token.metadata.coingeckoId;
    }

    // Otherwise, try to search by symbol and chain
    return this.searchToken(token.symbol, token.chain);
  }

  /**
   * Get trending coins from CoinGecko
   */
  async getTrendingCoins(): Promise<any> {
    try {
      const response = await this.client.get('/search/trending');
      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get trending coins: ${error.message}`);
      return null;
    }
  }

  /**
   * Get new coin listings from CoinGecko
   */
  async getNewCoinListings(perPage: number = 50): Promise<any> {
    try {
      const response = await this.client.get('/coins/new', {
        params: { per_page: perPage },
      });
      return response.data;
    } catch (error: any) {
      // New listings endpoint might not be available in free tier
      this.logger.debug(`New listings endpoint not available: ${error.message}`);
      return null;
    }
  }

  /**
   * Get coin data by CoinGecko ID
   */
  async getCoinData(coingeckoId: string): Promise<any> {
    try {
      const response = await this.client.get(`/coins/${coingeckoId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.debug(`Failed to get coin data for ${coingeckoId}: ${error.message}`);
      return null;
    }
  }
}

