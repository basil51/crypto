import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokensService } from '../../tokens/tokens.service';
import { TheGraphService } from '../../integrations/services/thegraph.service';
import { CoinGeckoService } from '../../integrations/services/coingecko.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { CovalentService } from '../../integrations/services/covalent.service';
import { MoralisService } from '../../integrations/services/moralis.service';
import { AlchemyService } from '../../integrations/services/alchemy.service';

interface DiscoveredToken {
  chain: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  source: 'dex' | 'coingecko' | 'whale' | 'manual' | 'transaction' | 'signal';
  metadata?: any;
}

@Injectable()
export class TokenDiscoveryService {
  private readonly logger = new Logger(TokenDiscoveryService.name);
  
  // Configuration thresholds
  private readonly minLiquidityUSD: number;
  private readonly minVolume24hUSD: number;
  private readonly minMarketCapUSD: number;
  private readonly maxTokenAgeHours: number;
  private readonly discoveryEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private tokensService: TokensService,
    private theGraphService: TheGraphService,
    private coinGeckoService: CoinGeckoService,
    private integrationsService: IntegrationsService,
    private configService: ConfigService,
    private covalentService: CovalentService,
    private moralisService: MoralisService,
    private alchemyService: AlchemyService,
  ) {
    // Load configuration from environment variables
    this.minLiquidityUSD = parseFloat(
      this.configService.get<string>('TOKEN_DISCOVERY_MIN_LIQUIDITY_USD') || '10000',
    );
    this.minVolume24hUSD = parseFloat(
      this.configService.get<string>('TOKEN_DISCOVERY_MIN_VOLUME_24H_USD') || '50000',
    );
    this.minMarketCapUSD = parseFloat(
      this.configService.get<string>('TOKEN_DISCOVERY_MIN_MARKET_CAP_USD') || '100000',
    );
    this.maxTokenAgeHours = parseFloat(
      this.configService.get<string>('TOKEN_DISCOVERY_MAX_AGE_HOURS') || '168', // 7 days default
    );
    // Default to enabled if not explicitly set to 'false'
    this.discoveryEnabled = this.configService.get<string>('TOKEN_DISCOVERY_ENABLED') !== 'false';

    if (!this.discoveryEnabled) {
      this.logger.warn('⚠️ Token discovery is disabled (set TOKEN_DISCOVERY_ENABLED=true to enable)');
    } else {
      this.logger.log(`✅ Token discovery enabled with thresholds: minLiquidity=${this.minLiquidityUSD}, minVolume=${this.minVolume24hUSD}, minMarketCap=${this.minMarketCapUSD}`);
    }
  }

  /**
   * Run token discovery every 15 minutes
   */
  @Cron('0 */15 * * * *') // Every 15 minutes
  async discoverTokens() {
    // Debug: Log when TokenDiscoveryService starts running
    this.logger.log('🚀 TokenDiscoveryService: Starting token discovery process...');
    
    if (!this.discoveryEnabled) {
      this.logger.debug('Token discovery is disabled (TOKEN_DISCOVERY_ENABLED=false)');
      return;
    }

    this.logger.log('Starting automatic token discovery...');

    try {
      const discoveredTokens: DiscoveredToken[] = [];

      // 1. Discover from DEXs (Uniswap, PancakeSwap)
      // Note: The Graph public endpoints have been deprecated, so this may return 0 tokens
      try {
        const dexTokens = await this.discoverFromDEXs();
        discoveredTokens.push(...dexTokens);
        if (dexTokens.length > 0) {
          this.logger.log(`Discovered ${dexTokens.length} tokens from DEXs`);
        } else {
          this.logger.debug('No tokens discovered from DEXs (The Graph endpoints may be unavailable)');
        }
      } catch (error) {
        // Don't log as error - The Graph endpoints are deprecated, this is expected
        this.logger.warn(`DEX discovery skipped: ${error.message}`);
      }

      // 2. Discover from CoinGecko trending/new
      try {
        const coingeckoTokens = await this.discoverFromCoinGecko();
        discoveredTokens.push(...coingeckoTokens);
        this.logger.log(`Discovered ${coingeckoTokens.length} tokens from CoinGecko`);
      } catch (error) {
        this.logger.error(`Failed to discover tokens from CoinGecko: ${error.message}`, error.stack);
      }

      // 3. Discover from transactions (extract token addresses from raw data)
      try {
        const transactionTokens = await this.discoverFromTransactions();
        discoveredTokens.push(...transactionTokens);
        this.logger.log(`Discovered ${transactionTokens.length} tokens from transactions`);
      } catch (error) {
        this.logger.error(`Failed to discover tokens from transactions: ${error.message}`, error.stack);
      }

      // 4. Discover from signals (extract token addresses from signal metadata)
      try {
        const signalTokens = await this.discoverFromSignals();
        discoveredTokens.push(...signalTokens);
        this.logger.log(`Discovered ${signalTokens.length} tokens from signals`);
      } catch (error) {
        this.logger.error(`Failed to discover tokens from signals: ${error.message}`, error.stack);
      }

      // 5. Discover from large whale transactions (if Covalent is available)
      try {
        const whaleTokens = await this.discoverFromWhaleTransactions();
        discoveredTokens.push(...whaleTokens);
        this.logger.log(`Discovered ${whaleTokens.length} tokens from whale transactions`);
      } catch (error) {
        this.logger.error(`Failed to discover tokens from whale transactions: ${error.message}`, error.stack);
      }

      // Remove duplicates and add to database
      const uniqueTokens = this.deduplicateTokens(discoveredTokens);
      let addedCount = 0;

      this.logger.log(`Processing ${uniqueTokens.length} unique discovered tokens...`);

      for (const token of uniqueTokens) {
        try {
          const added = await this.addTokenIfNew(token);
          if (added) {
            addedCount++;
            this.logger.log(`✅ Added new token: ${token.symbol} (${token.chain}) - ${token.contractAddress}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to add token ${token.symbol}: ${error.message}`);
        }
      }

      this.logger.log(
        `✅ Token discovery completed: ${addedCount} new tokens added out of ${uniqueTokens.length} discovered`,
      );
    } catch (error) {
      this.logger.error(`❌ Token discovery failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Discover new tokens from DEXs (Uniswap, PancakeSwap)
   * Note: The Graph public endpoints have been deprecated. This method will gracefully
   * handle failures and continue with other discovery sources.
   */
  private async discoverFromDEXs(): Promise<DiscoveredToken[]> {
    const discovered: DiscoveredToken[] = [];
    const networks: Array<{ network: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2'; chain: string }> = [
      { network: 'uniswap-v2', chain: 'ethereum' },
      { network: 'uniswap-v3', chain: 'ethereum' },
      { network: 'pancakeswap-v2', chain: 'bsc' },
    ];

    for (const { network, chain } of networks) {
      try {
        // Get recent pools with high liquidity
        const pools = await this.theGraphService.getRecentHighLiquidityPools(
          network,
          this.minLiquidityUSD,
          this.maxTokenAgeHours,
          100,
        );

        if (!pools || pools.length === 0) {
          this.logger.debug(`No pools found from ${network}`);
          continue;
        }

        for (const pool of pools) {
          try {
            // Get token0 and token1
            const token0 = pool.token0;
            const token1 = pool.token1;
            const liquidity = parseFloat(pool.totalValueLockedUSD || '0');
            const volume = parseFloat(pool.volumeUSD || '0');

            // Check if pool meets criteria
            if (!this.meetsDiscoveryCriteria({ totalValueLockedUSD: liquidity, volumeUSD: volume })) {
              continue;
            }

            // Check if token0 is new (not WETH, USDC, etc.)
            if (this.isNewToken(token0.id, chain)) {
              const tokenMetadata = await this.getTokenMetadata(token0.id, chain);
              const discoveredToken: DiscoveredToken = {
                chain,
                symbol: token0.symbol || tokenMetadata?.symbol || 'UNKNOWN',
                name: token0.name || tokenMetadata?.name || token0.symbol || 'Unknown Token',
                contractAddress: token0.id,
                decimals: token0.decimals || tokenMetadata?.decimals || 18,
                source: 'dex' as const,
                metadata: {
                  poolAddress: pool.id,
                  liquidityUSD: liquidity,
                  volumeUSD: volume,
                  network,
                  createdAtTimestamp: pool.createdAtTimestamp,
                },
              };
              
              // Debug: Log new signal found
              this.logger.log(
                `🔍 Debug a new signal found: Source=dex (${network}), Token=${discoveredToken.name} (${discoveredToken.symbol}), ` +
                `Chain=${chain}, Address=${token0.id}`
              );
              
              discovered.push(discoveredToken);
            }

            // Also check token1
            if (this.isNewToken(token1.id, chain)) {
              const tokenMetadata = await this.getTokenMetadata(token1.id, chain);
              const discoveredToken: DiscoveredToken = {
                chain,
                symbol: token1.symbol || tokenMetadata?.symbol || 'UNKNOWN',
                name: token1.name || tokenMetadata?.name || token1.symbol || 'Unknown Token',
                contractAddress: token1.id,
                decimals: token1.decimals || tokenMetadata?.decimals || 18,
                source: 'dex' as const,
                metadata: {
                  poolAddress: pool.id,
                  liquidityUSD: liquidity,
                  volumeUSD: volume,
                  network,
                  createdAtTimestamp: pool.createdAtTimestamp,
                },
              };
              
              // Debug: Log new signal found
              this.logger.log(
                `🔍 Debug a new signal found: Source=dex (${network}), Token=${discoveredToken.name} (${discoveredToken.symbol}), ` +
                `Chain=${chain}, Address=${token1.id}`
              );
              
              discovered.push(discoveredToken);
            }
          } catch (poolError) {
            // Skip individual pool errors, continue with next pool
            this.logger.debug(`Error processing pool from ${network}: ${poolError.message}`);
            continue;
          }
        }
      } catch (error: any) {
        // The Graph endpoints have been deprecated/removed - log as warning, not error
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('removed') || errorMessage.includes('deprecated')) {
          this.logger.warn(
            `⚠️ The Graph endpoint for ${network} is no longer available. ` +
            `Skipping DEX discovery from ${network}. Consider using alternative sources.`,
          );
        } else {
          this.logger.warn(`Failed to discover tokens from ${network}: ${errorMessage}`);
        }
        // Continue with other networks and discovery sources
        continue;
      }
    }

    return discovered;
  }


  /**
   * Discover tokens from CoinGecko trending/new listings
   */
  private async discoverFromCoinGecko(): Promise<DiscoveredToken[]> {
    const discovered: DiscoveredToken[] = [];

    try {
      // Get trending coins
      const trendingResponse = await this.coinGeckoService.getTrendingCoins();
      if (trendingResponse?.coins) {
        for (const coin of trendingResponse.coins.slice(0, 20)) {
          const coinData = coin.item;
          if (coinData?.platforms) {
            // Get Ethereum tokens first
            if (coinData.platforms.ethereum) {
              const token = await this.getTokenFromCoinGecko(
                coinData.id,
                'ethereum',
                coinData.platforms.ethereum,
              );
              if (token) {
                discovered.push(token);
              }
            }
            // Get BSC tokens
            if (coinData.platforms['binance-smart-chain']) {
              const token = await this.getTokenFromCoinGecko(
                coinData.id,
                'bsc',
                coinData.platforms['binance-smart-chain'],
              );
              if (token) {
                discovered.push(token);
              }
            }
          }
        }
      }

      // Get new coin listings (if API supports it)
      const newListingsResponse = await this.coinGeckoService.getNewCoinListings(50);
      if (newListingsResponse) {
        for (const coin of newListingsResponse) {
          if (coin.platforms?.ethereum) {
            const token = await this.getTokenFromCoinGecko(
              coin.id,
              'ethereum',
              coin.platforms.ethereum,
            );
            if (token) {
              discovered.push(token);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to discover tokens from CoinGecko: ${error.message}`);
    }

    return discovered;
  }

  /**
   * Get token data from CoinGecko
   */
  private async getTokenFromCoinGecko(
    coingeckoId: string,
    chain: string,
    contractAddress: string,
  ): Promise<DiscoveredToken | null> {
    try {
      const data = await this.coinGeckoService.getCoinData(coingeckoId);

      if (!data) {
        return null;
      }
      const marketCap = data.market_data?.market_cap?.usd || 0;
      const volume24h = data.market_data?.total_volume?.usd || 0;

      // Check if meets criteria
      if (marketCap < this.minMarketCapUSD || volume24h < this.minVolume24hUSD) {
        return null;
      }

      const discoveredToken: DiscoveredToken = {
        chain,
        symbol: data.symbol?.toUpperCase() || 'UNKNOWN',
        name: data.name || data.symbol || 'Unknown Token',
        contractAddress,
        decimals: 18, // Default, will be updated when token is added
        source: 'coingecko' as const,
        metadata: {
          coingeckoId,
          marketCap,
          volume24h,
          price: data.market_data?.current_price?.usd,
        },
      };
      
      // Debug: Log new signal found
      this.logger.log(
        `🔍 Debug a new signal found: Source=coingecko, Token=${discoveredToken.name} (${discoveredToken.symbol}), ` +
        `Chain=${chain}, Address=${contractAddress}`
      );
      
      return discoveredToken;
    } catch (error) {
      this.logger.debug(`Failed to get token data from CoinGecko for ${coingeckoId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Discover tokens from large whale transactions
   */
  private async discoverFromWhaleTransactions(): Promise<DiscoveredToken[]> {
    const discovered: DiscoveredToken[] = [];

    try {
      // Get recent large transactions from Covalent (if available)
      if (this.covalentService && this.covalentService.isAvailable()) {
        // Query for large transfers across all tokens in last 24 hours
        const chains = ['ethereum', 'bsc', 'polygon'];
        
        for (const chain of chains) {
          try {
            const transfers = await this.covalentService.getAllLargeTransfers(
              chain,
              50000, // $50k minimum for discovery
              50, // Limit to 50 per chain
            );

            for (const transfer of transfers) {
              const tokenAddress = transfer.currency.address.toLowerCase();
              
              // Check if token already exists
              const exists = await this.tokensService.findByAddress(chain, tokenAddress);
              if (!exists && this.isNewToken(tokenAddress, chain)) {
                const metadata = await this.getTokenMetadata(tokenAddress, chain);
                if (metadata) {
                  discovered.push({
                    chain,
                    symbol: transfer.currency.symbol || metadata.symbol || 'UNKNOWN',
                    name: transfer.currency.name || metadata.name || 'Unknown Token',
                    contractAddress: tokenAddress,
                    decimals: metadata.decimals || 18,
                    source: 'whale' as const,
                    metadata: {
                      discoveredFrom: 'whale_transaction',
                      transactionHash: transfer.transaction.hash,
                      amount: transfer.amount,
                      discoveredAt: new Date().toISOString(),
                    },
                  });
                }
              }
            }
          } catch (error) {
            this.logger.debug(`Failed to get whale transactions for ${chain}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to discover tokens from whale transactions: ${error.message}`);
    }

    return discovered;
  }

  /**
   * Discover tokens from transactions that reference unknown token addresses
   * This method looks at transaction raw data to find token addresses that aren't in our database
   */
  private async discoverFromTransactions(): Promise<DiscoveredToken[]> {
    const discovered: DiscoveredToken[] = [];

    try {
      // Get recent transactions (last 7 days) that might have token addresses in raw data
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const transactions = await this.prisma.transaction.findMany({
        where: {
          timestamp: { gte: sevenDaysAgo },
          raw: { not: null },
        },
        select: {
          raw: true,
          token: {
            select: {
              chain: true,
            },
          },
        },
        take: 1000, // Limit to avoid memory issues
      });

      this.logger.debug(`Checking ${transactions.length} transactions for new token addresses`);

      // Extract token addresses from transaction raw data
      const tokenAddresses = new Set<string>();
      
      for (const tx of transactions) {
        if (!tx.raw || !tx.token) continue;
        
        try {
          const raw = tx.raw as any;
          const chain = tx.token.chain;

          // Try to extract token address from various fields in raw data
          const possibleAddresses = [
            raw.address,
            raw.tokenAddress,
            raw.contractAddress,
            raw.token?.address,
            raw.token?.contractAddress,
            raw.to,
            raw.tokenAddresses?.[0],
          ];

          for (const addr of possibleAddresses) {
            if (addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
              const normalizedAddr = addr.toLowerCase();
              
              // Check if this token already exists
              const exists = await this.tokensService.findByAddress(chain, normalizedAddr);
              if (!exists && this.isNewToken(normalizedAddr, chain)) {
                tokenAddresses.add(`${chain}:${normalizedAddr}`);
              }
            }
          }
        } catch (error) {
          // Skip invalid raw data
          continue;
        }
      }

      this.logger.log(`Found ${tokenAddresses.size} potential new token addresses from transactions`);

      // Get metadata for each discovered address
      for (const key of tokenAddresses) {
        const [chain, address] = key.split(':');
        try {
          const metadata = await this.getTokenMetadata(address, chain);
          if (metadata) {
            const discoveredToken: DiscoveredToken = {
              chain,
              symbol: metadata.symbol || 'UNKNOWN',
              name: metadata.name || 'Unknown Token',
              contractAddress: address,
              decimals: metadata.decimals || 18,
              source: 'transaction' as const,
              metadata: {
                discoveredFrom: 'transaction_raw_data',
                discoveredAt: new Date().toISOString(),
              },
            };
            
            // Debug: Log new signal found
            this.logger.log(
              `🔍 Debug a new signal found: Source=transaction, Token=${discoveredToken.name} (${discoveredToken.symbol}), ` +
              `Chain=${chain}, Address=${address}`
            );
            
            discovered.push(discoveredToken);
          }
        } catch (error) {
          this.logger.debug(`Failed to get metadata for ${address}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to discover tokens from transactions: ${error.message}`);
    }

    return discovered;
  }

  /**
   * Discover tokens from accumulation signals
   * Extract token information from signals that might reference tokens not in our database
   */
  private async discoverFromSignals(): Promise<DiscoveredToken[]> {
    const discovered: DiscoveredToken[] = [];

    try {
      // Get recent signals (last 7 days) with metadata that might contain token addresses
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const signals = await this.prisma.accumulationSignal.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          metadata: { not: null },
        },
        include: {
          token: {
            select: {
              chain: true,
              contractAddress: true,
              name: true,
              symbol: true,
            },
          },
        },
        take: 500,
      });

      this.logger.debug(`Checking ${signals.length} signals for new token addresses`);
      
      // Debug: Log each signal's token information
      this.logger.debug(`=== Listing all ${signals.length} signals and their tokens ===`);
      signals.forEach((signal, index) => {
        if (signal.token) {
          this.logger.debug(
            `Signal ${index + 1}/${signals.length}: Token="${signal.token.name}" (${signal.token.symbol}), ` +
            `Chain=${signal.token.chain}, Address=${signal.token.contractAddress}`
          );
        } else {
          this.logger.debug(`Signal ${index + 1}/${signals.length}: No token relation`);
        }
      });
      this.logger.debug(`=== Finished listing signals ===`);

      const tokenAddresses = new Set<string>();
      let signalsWithTokens = 0;
      let signalsWithoutTokens = 0;
      let tokensAlreadyExist = 0;
      let tokensFound = 0;

      for (const signal of signals) {
        if (!signal.token) {
          signalsWithoutTokens++;
          continue;
        }

        signalsWithTokens++;

        try {
          const chain = signal.token.chain;
          const tokenAddress = signal.token.contractAddress;
          const tokenName = signal.token.name || 'Unknown';
          const tokenSymbol = signal.token.symbol || 'UNKNOWN';

          // First, check the token from the signal relation itself
          if (tokenAddress && typeof tokenAddress === 'string' && tokenAddress.startsWith('0x') && tokenAddress.length === 42) {
            const normalizedAddr = tokenAddress.toLowerCase();
            
            // Check if this token already exists in our database
            const exists = await this.tokensService.findByAddress(chain, normalizedAddr);
            if (exists) {
              tokensAlreadyExist++;
              //this.logger.debug(`Token "${tokenName}" (${tokenSymbol}) already exists in database`);
            } else if (this.isNewToken(normalizedAddr, chain)) {
              tokenAddresses.add(`${chain}:${normalizedAddr}`);
              tokensFound++;
            } 
          }

          // Also check metadata for additional token addresses (if metadata exists)
          if (signal.metadata) {
            const metadata = signal.metadata as any;
            
            // Extract token addresses from signal metadata
            const possibleAddresses = [
              metadata.tokenAddress,
              metadata.contractAddress,
              metadata.token?.address,
              metadata.token?.contractAddress,
              metadata.poolAddress, // Sometimes signals reference pool addresses
            ];

            for (const addr of possibleAddresses) {
              if (addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
                const normalizedAddr = addr.toLowerCase();
                
                // Skip if it's the same as the signal's token
                if (normalizedAddr === tokenAddress?.toLowerCase()) {
                  continue;
                }
                
                // Check if this token already exists
                const exists = await this.tokensService.findByAddress(chain, normalizedAddr);
                if (!exists && this.isNewToken(normalizedAddr, chain)) {
                  tokenAddresses.add(`${chain}:${normalizedAddr}`);
                  this.logger.debug(`Found new token from signal metadata: ${normalizedAddr} on ${chain}`);
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid signals
          this.logger.debug(`Error processing signal ${signal.id}: ${error.message}`);
          continue;
        }
      }

      this.logger.log(
        `Found ${tokenAddresses.size} potential new token addresses from signals ` +
        `(Signals with tokens: ${signalsWithTokens}, Signals without tokens: ${signalsWithoutTokens}, ` +
        `Tokens already exist: ${tokensAlreadyExist}, New tokens found: ${tokensFound})`
      );

      // Get metadata for each discovered address
      for (const key of tokenAddresses) {
        const [chain, address] = key.split(':');
        try {
          const metadata = await this.getTokenMetadata(address, chain);
          if (metadata) {
            const discoveredToken: DiscoveredToken = {
              chain,
              symbol: metadata.symbol || 'UNKNOWN',
              name: metadata.name || 'Unknown Token',
              contractAddress: address,
              decimals: metadata.decimals || 18,
              source: 'signal' as const,
              metadata: {
                discoveredFrom: 'accumulation_signal',
                discoveredAt: new Date().toISOString(),
              },
            };
            
            // Debug: Log new signal found
            this.logger.log(
              `🔍 Debug a new signal found: Source=signal, Token=${discoveredToken.name} (${discoveredToken.symbol}), ` +
              `Chain=${chain}, Address=${address}`
            );
            
            discovered.push(discoveredToken);
          }
        } catch (error) {
          this.logger.debug(`Failed to get metadata for ${address}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to discover tokens from signals: ${error.message}`);
    }

    return discovered;
  }

  /**
   * Get token metadata from blockchain
   */
  private async getTokenMetadata(address: string, chain: string): Promise<any> {
    try {
      // Try to get from Moralis
      if (this.moralisService && this.configService.get<string>('MORALIS_API_KEY')) {
        try {
          const metadata = await this.moralisService.getTokenMetadata([address], chain);
          if (metadata && metadata.length > 0) {
            return {
              symbol: metadata[0].symbol,
              name: metadata[0].name,
              decimals: parseInt(metadata[0].decimals) || 18,
            };
          }
        } catch (error) {
          this.logger.debug(`Moralis metadata fetch failed: ${error.message}`);
        }
      }

      // Try Alchemy
      if (this.alchemyService && this.configService.get<string>('ALCHEMY_API_KEY')) {
        try {
          const metadata = await this.alchemyService.getTokenMetadata(address);
          if (metadata) {
            return {
              symbol: metadata.symbol,
              name: metadata.name,
              decimals: metadata.decimals || 18,
            };
          }
        } catch (error) {
          this.logger.debug(`Alchemy metadata fetch failed: ${error.message}`);
        }
      }

      // Fallback: return basic info
      return {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      };
    } catch (error) {
      this.logger.debug(`Failed to get token metadata for ${address}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if token is new (not a major stablecoin or native token)
   */
  private isNewToken(address: string, chain: string): boolean {
    const normalizedAddress = address.toLowerCase();
    
    // Skip native tokens
    if (normalizedAddress === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    // Skip major stablecoins and wrapped tokens
    const majorTokens = [
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', // CAKE
    ];

    return !majorTokens.includes(normalizedAddress);
  }

  /**
   * Check if token meets discovery criteria
   */
  private meetsDiscoveryCriteria(pool: { totalValueLockedUSD: number; volumeUSD: number }): boolean {
    const liquidity = pool.totalValueLockedUSD || 0;
    const volume = pool.volumeUSD || 0;

    return (
      liquidity >= this.minLiquidityUSD &&
      volume >= this.minVolume24hUSD
    );
  }

  /**
   * Remove duplicate tokens (same contract address)
   */
  private deduplicateTokens(tokens: DiscoveredToken[]): DiscoveredToken[] {
    const seen = new Map<string, DiscoveredToken>();

    for (const token of tokens) {
      const key = `${token.chain.toLowerCase()}:${token.contractAddress.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, token);
      } else {
        // Keep the one with more metadata
        const existing = seen.get(key)!;
        if (token.metadata && (!existing.metadata || Object.keys(token.metadata).length > Object.keys(existing.metadata || {}).length)) {
          seen.set(key, token);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Add token to database if it doesn't exist
   */
  private async addTokenIfNew(token: DiscoveredToken): Promise<boolean> {
    try {
      // Check if token already exists
      const existing = await this.tokensService.findByAddress(
        token.chain,
        token.contractAddress,
      );

      if (existing) {
        return false; // Token already exists
      }

      // Debug: Log before adding token
      this.logger.log(
        `📝 A new token will be added to tokens table [${token.name} + ${token.symbol}]`
      );

      // Create new token
      await this.tokensService.create({
        chain: token.chain,
        symbol: token.symbol,
        name: token.name,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
        active: true,
        metadata: {
          ...token.metadata,
          discoveredAt: new Date().toISOString(),
          source: token.source,
        },
      });

      // Debug: Log after token added successfully
      this.logger.log(
        `✅ Token added successful: ${token.name} (${token.symbol}) - ${token.contractAddress}`
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to add token ${token.symbol}: ${error.message}`);
      return false;
    }
  }

  /**
   * Manually trigger discovery (for testing or manual runs)
   */
  async runDiscovery(): Promise<{ discovered: number; added: number }> {
    // Debug: Log when TokenDiscoveryService starts running
    this.logger.log('🚀 TokenDiscoveryService: Starting manual token discovery process...');
    this.logger.log('🔍 Manually triggering token discovery...');
    
    let discovered = 0;
    let added = 0;

    try {
      // 1. Discover from DEXs
      const dexTokens = await this.discoverFromDEXs();
      discovered += dexTokens.length;
      this.logger.log(`  - DEXs: ${dexTokens.length} tokens`);

      // 2. Discover from CoinGecko
      const coingeckoTokens = await this.discoverFromCoinGecko();
      discovered += coingeckoTokens.length;
      this.logger.log(`  - CoinGecko: ${coingeckoTokens.length} tokens`);

      // 3. Discover from transactions
      const transactionTokens = await this.discoverFromTransactions();
      discovered += transactionTokens.length;
      this.logger.log(`  - Transactions: ${transactionTokens.length} tokens`);

      // 4. Discover from signals
      const signalTokens = await this.discoverFromSignals();
      discovered += signalTokens.length;
      this.logger.log(`  - Signals: ${signalTokens.length} tokens`);

      // 5. Discover from whale transactions
      const whaleTokens = await this.discoverFromWhaleTransactions();
      discovered += whaleTokens.length;
      this.logger.log(`  - Whale transactions: ${whaleTokens.length} tokens`);

      const uniqueTokens = this.deduplicateTokens([
        ...dexTokens,
        ...coingeckoTokens,
        ...transactionTokens,
        ...signalTokens,
        ...whaleTokens,
      ]);

      this.logger.log(`  - Total unique: ${uniqueTokens.length} tokens`);

      for (const token of uniqueTokens) {
        const wasAdded = await this.addTokenIfNew(token);
        if (wasAdded) {
          added++;
          this.logger.log(`  ✅ Added: ${token.symbol} (${token.chain})`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Manual discovery failed: ${error.message}`, error.stack);
      throw error;
    }

    this.logger.log(`✅ Manual discovery completed: ${added} new tokens added out of ${discovered} discovered`);
    return { discovered, added };
  }
}

