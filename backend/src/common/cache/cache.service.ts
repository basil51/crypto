import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private readonly enabled: boolean;
  private readonly defaultTtl: number;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('REDIS_URL') ? true : false;
    this.defaultTtl = this.configService.get<number>('CACHE_TTL') || 300; // 5 minutes default
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Redis cache is disabled (REDIS_URL not configured)');
      return;
    }

    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        this.logger.warn('Redis cache is disabled (REDIS_URL is empty)');
        return;
      }

      // Create Redis client with minimal retry
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1, // Only try once
        retryStrategy: () => null, // Never retry on failure
        reconnectOnError: () => false, // Don't auto-reconnect
        connectTimeout: 2000, // 2 second connection timeout
        enableReadyCheck: true,
      });

      // Set up event handlers
      let hasConnected = false;
      let hasFailed = false;

      this.redisClient.on('connect', () => {
        hasConnected = true;
        this.logger.log('Redis cache connected');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis cache ready');
      });

      this.redisClient.on('error', (err) => {
        // Only log first error, then disable
        if (!hasFailed) {
          hasFailed = true;
          this.logger.warn(`Redis cache unavailable: ${err.message}. Continuing without cache.`);
          // Clean up
          if (this.redisClient) {
            this.redisClient.disconnect();
            this.redisClient = null;
          }
        }
      });

      // Test connection with a short timeout
      try {
        const pingResult = await Promise.race([
          this.redisClient.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 2000)
          ),
        ]);
        
        if (pingResult === 'PONG') {
          this.logger.log('Redis cache initialized successfully');
        }
      } catch (pingError: any) {
        // Ping failed, disable cache
        hasFailed = true;
        this.logger.warn(`Redis cache connection test failed: ${pingError.message}. Continuing without cache.`);
        if (this.redisClient) {
          try {
            this.redisClient.disconnect();
          } catch {
            // Ignore disconnect errors
          }
          this.redisClient = null;
        }
      }
    } catch (error: any) {
      // Initial setup failed
      this.logger.warn(`Failed to initialize Redis cache: ${error.message}. Continuing without cache.`);
      if (this.redisClient) {
        try {
          this.redisClient.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redisClient = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis cache disconnected');
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.enabled && this.redisClient !== null;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redisClient!.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const ttl = ttlSeconds || this.defaultTtl;
      const serialized = JSON.stringify(value);
      await this.redisClient!.setex(key, ttl, serialized);
      return true;
    } catch (error: any) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redisClient!.del(key);
      return true;
    } catch (error: any) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.redisClient!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redisClient!.del(...keys);
      return keys.length;
    } catch (error: any) {
      this.logger.error(`Cache delete pattern error for ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redisClient!.exists(key);
      return result === 1;
    } catch (error: any) {
      this.logger.error(`Cache exists error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get or set with cache
   * If value exists in cache, return it. Otherwise, execute callback and cache the result.
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate cache for a specific pattern
   * Useful for invalidating related cache entries
   */
  async invalidate(pattern: string): Promise<void> {
    await this.delPattern(pattern);
    this.logger.debug(`Cache invalidated for pattern: ${pattern}`);
  }
}

