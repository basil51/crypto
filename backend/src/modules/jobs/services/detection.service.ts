import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignalsService } from '../../signals/signals.service';
import { AlertDispatcherService } from '../../alerts/services/alert-dispatcher.service';
import { TokensService } from '../../tokens/tokens.service';
import { Prisma, SignalType } from '@prisma/client';

interface DetectionRule {
  name: string;
  weight: number; // Weight for scoring (0-1)
  execute: (context: DetectionContext) => Promise<number>; // Returns score 0-100
}

interface DetectionContext {
  tokenId: string;
  token: any;
  transactions: any[];
  walletPositions: any[];
  timeWindow: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);
  private rules: DetectionRule[] = [];
  
  // Configurable thresholds
  private readonly signalThreshold: number;
  private readonly whaleInflowThreshold: number;
  private readonly concentratedBuysThreshold: number;

  constructor(
    private prisma: PrismaService,
    private signalsService: SignalsService,
    private alertDispatcher: AlertDispatcherService,
    private tokensService: TokensService,
    private configService: ConfigService,
  ) {
    // Load thresholds from environment or use defaults
    this.signalThreshold = this.configService.get<number>('DETECTION_SIGNAL_THRESHOLD') || 60;
    this.whaleInflowThreshold = this.configService.get<number>('DETECTION_WHALE_THRESHOLD') || 80;
    this.concentratedBuysThreshold = this.configService.get<number>('DETECTION_CONCENTRATED_THRESHOLD') || 70;
    
    this.logger.log(
      `Detection thresholds: Signal=${this.signalThreshold}, Whale=${this.whaleInflowThreshold}, Concentrated=${this.concentratedBuysThreshold}`
    );
    
    this.initializeRules();
  }

  /**
   * Initialize detection rules
   * Updated with Roadmap 4.0 rules:
   * Rule 1: Large Transfers (Covalent) - covered by detectLargeInflows
   * Rule 2: Whale Clusters (Covalent) - covered by detectConcentratedBuys
   * Rule 3: Exchange Flows (Covalent + Scan APIs) - covered by detectLargeInflows
   * Rule 4: Holding Pattern (existing)
   * Rule 5: Volume Spike (existing)
   * Rule 6: DEX Liquidity Increase (The Graph) - NEW
   * Rule 7: Repeated Large Swaps (The Graph) - NEW
   */
  private initializeRules() {
    this.rules = [
      {
        name: 'Concentrated Buys',
        weight: 0.25,
        execute: this.detectConcentratedBuys.bind(this),
      },
      {
        name: 'Large Wallet Inflows',
        weight: 0.2,
        execute: this.detectLargeInflows.bind(this),
      },
      {
        name: 'New Whale Addresses',
        weight: 0.15,
        execute: this.detectNewWhaleAddresses.bind(this),
      },
      {
        name: 'Holding Pattern Increase',
        weight: 0.12,
        execute: this.detectHoldingPatterns.bind(this),
      },
      {
        name: 'Transaction Volume Spike',
        weight: 0.08,
        execute: this.detectVolumeSpike.bind(this),
      },
      {
        name: 'DEX Liquidity Increase',
        weight: 0.1,
        execute: this.detectDexLiquidityIncrease.bind(this),
      },
      {
        name: 'Repeated Large Swaps',
        weight: 0.1,
        execute: this.detectRepeatedLargeSwaps.bind(this),
      },
    ];
  }

  /**
   * Run detection for all active tokens AND discover new tokens from transaction data
   */
  async runDetection(): Promise<void> {
    this.logger.log('Starting accumulation detection...');

    try {
      // First, discover new tokens from recent transactions
      await this.discoverTokensFromTransactions();

      // Then, get all active tokens (including newly discovered ones)
      const tokens = await this.prisma.token.findMany({
        where: { active: true },
      });

      if (tokens.length === 0) {
        this.logger.warn('No active tokens to analyze');
        return;
      }

      this.logger.log(`Analyzing ${tokens.length} tokens`);

      // Analyze each token
      for (const token of tokens) {
        try {
          await this.analyzeToken(token.id);
        } catch (error) {
          this.logger.error(
            `Failed to analyze token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log('Accumulation detection completed');
    } catch (error) {
      this.logger.error(`Detection failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Discover new tokens from transaction data
   * This allows us to detect signals for tokens that aren't yet in our database
   * The key insight: We should detect signals from ANY token activity, not just tokens we already track
   */
  private async discoverTokensFromTransactions(): Promise<void> {
    this.logger.log('Discovering new tokens from transaction data...');

    try {
      // Get all unique tokenIds from recent transactions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentTransactions = await this.prisma.transaction.findMany({
        where: {
          timestamp: { gte: sevenDaysAgo },
        },
        select: {
          tokenId: true,
          raw: true,
        },
        distinct: ['tokenId'],
      });

      // For each tokenId in transactions, ensure token exists
      for (const tx of recentTransactions) {
        const tokenId = tx.tokenId;
        let token = await this.prisma.token.findUnique({
          where: { id: tokenId },
        });

        if (!token) {
          // Token doesn't exist but we have transactions for it - create it
          const rawData = tx.raw as any;
          const tokenSymbol = rawData?.tokenSymbol || rawData?.symbol || `TOKEN_${tokenId.slice(0, 8)}`;
          const tokenName = rawData?.tokenName || rawData?.name || 'Unknown Token';
          const chain = rawData?.chain || 'ethereum';
          const contractAddress = rawData?.contractAddress || rawData?.address || tokenId;
          const decimals = rawData?.decimals || 18;

          try {
            token = await this.prisma.token.create({
              data: {
                id: tokenId,
                chain,
                symbol: tokenSymbol,
                name: tokenName,
                contractAddress,
                decimals,
                active: true,
                metadata: {
                  createdFromTransaction: true,
                  discoveredAt: new Date().toISOString(),
                },
              },
            });
            this.logger.log(
              `Created missing token ${tokenId} (${tokenSymbol}) from transaction data`,
            );
          } catch (createError: any) {
            if (createError.code !== 'P2002') {
              this.logger.warn(
                `Failed to create token ${tokenId}: ${createError.message}`,
              );
            }
          }
        } else if (!token.active) {
          // Token exists but is inactive - activate it so we can detect signals
          await this.prisma.token.update({
            where: { id: tokenId },
            data: { active: true },
          });
          this.logger.log(`Activated token ${tokenId} (${token.symbol}) for signal detection`);
        }
      }

      this.logger.log(`Processed ${recentTransactions.length} tokens from transaction data`);
    } catch (error) {
      this.logger.warn(`Token discovery from transactions failed: ${error.message}`);
      // Don't throw - this is supplementary
    }
  }

  /**
   * Analyze a specific token for accumulation signals
   */
  private async analyzeToken(tokenId: string): Promise<void> {
    this.logger.debug(`Analyzing token ${tokenId}`);

    // Define time windows to analyze
    const windows = [
      { hours: 1, label: '1h' },
      { hours: 6, label: '6h' },
      { hours: 24, label: '24h' },
    ];

    for (const window of windows) {
      const end = new Date();
      const start = new Date(end.getTime() - window.hours * 60 * 60 * 1000);

      try {
        const score = await this.calculateAccumulationScore(tokenId, start, end);
        
        // Only create signal if score is above threshold
        if (score >= this.signalThreshold) {
          await this.createSignal(tokenId, score, start, end, window.label);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to analyze token ${tokenId} for window ${window.label}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Calculate accumulation score for a token in a time window
   */
  private async calculateAccumulationScore(
    tokenId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    // Get context data
    const context = await this.buildDetectionContext(tokenId, start, end);

    // Run all rules and calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;

    for (const rule of this.rules) {
      try {
        const ruleScore = await rule.execute(context);
        totalScore += ruleScore * rule.weight;
        totalWeight += rule.weight;
      } catch (error) {
        this.logger.warn(`Rule ${rule.name} failed: ${error.message}`);
      }
    }

    // Normalize score (0-100)
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    return Math.min(100, Math.max(0, normalizedScore));
  }

  /**
   * Build detection context for a token
   */
  private async buildDetectionContext(
    tokenId: string,
    start: Date,
    end: Date,
  ): Promise<DetectionContext> {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tokenId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const walletPositions = await this.prisma.walletPosition.findMany({
      where: { tokenId },
      include: { wallet: true },
      orderBy: { balance: 'desc' },
      take: 100, // Top 100 holders
    });

    return {
      tokenId,
      token,
      transactions,
      walletPositions,
      timeWindow: { start, end },
    };
  }

  /**
   * Detection Rule 1: Concentrated Buys
   * Detects multiple large buys by non-exchange wallets
   */
  private async detectConcentratedBuys(context: DetectionContext): Promise<number> {
    const { transactions } = context;
    
    // Group transactions by toAddress (buyers)
    const buyerMap = new Map<string, number>();
    
    transactions.forEach((tx) => {
      if (tx.toAddress && !this.isExchangeAddress(tx.toAddress)) {
        const current = buyerMap.get(tx.toAddress) || 0;
        buyerMap.set(tx.toAddress, current + Number(tx.amount));
      }
    });

    // Find large buyers (top 10% by volume)
    const buyers = Array.from(buyerMap.entries())
      .map(([address, amount]) => ({ address, amount }))
      .sort((a, b) => b.amount - a.amount);

    const threshold = buyers.length > 0 ? buyers[0].amount * 0.1 : 0;
    const largeBuyers = buyers.filter((b) => b.amount >= threshold);

    // Score based on number of large buyers and concentration
    let score = 0;
    if (largeBuyers.length >= 3) score += 40;
    if (largeBuyers.length >= 5) score += 30;
    if (largeBuyers.length >= 10) score += 30;

    return Math.min(100, score);
  }

  /**
   * Detection Rule 2: Large Wallet Inflows
   * Detects significant inflows to large wallets
   */
  private async detectLargeInflows(context: DetectionContext): Promise<number> {
    const { transactions, walletPositions } = context;

    // Get top wallets by current balance
    const topWallets = walletPositions
      .slice(0, 20)
      .map((wp) => wp.wallet.address);

    // Calculate inflows to top wallets
    let totalInflow = 0;
    transactions.forEach((tx) => {
      if (topWallets.includes(tx.toAddress)) {
        totalInflow += Number(tx.amount);
      }
    });

    // Score based on inflow volume
    let score = 0;
    if (totalInflow > 0) {
      // Normalize based on transaction count (more transactions = higher score)
      const avgTransactionSize = totalInflow / transactions.length;
      score = Math.min(100, (avgTransactionSize / 1000000) * 50); // Adjust threshold as needed
    }

    return score;
  }

  /**
   * Detection Rule 3: New Whale Addresses
   * Detects new addresses receiving large amounts
   */
  private async detectNewWhaleAddresses(context: DetectionContext): Promise<number> {
    const { transactions, walletPositions } = context;

    // Get existing whale addresses (top holders)
    const existingWhales = new Set(
      walletPositions.slice(0, 50).map((wp) => wp.wallet.address),
    );

    // Find new addresses receiving large amounts
    const newAddresses = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.toAddress && !existingWhales.has(tx.toAddress)) {
        const current = newAddresses.get(tx.toAddress) || 0;
        newAddresses.set(tx.toAddress, current + Number(tx.amount));
      }
    });

    // Score based on number of new addresses and amounts
    const largeNewAddresses = Array.from(newAddresses.entries())
      .filter(([, amount]) => amount > 10000) // Threshold for "large"
      .length;

    let score = 0;
    if (largeNewAddresses >= 5) score += 50;
    if (largeNewAddresses >= 10) score += 30;
    if (largeNewAddresses >= 20) score += 20;

    return Math.min(100, score);
  }

  /**
   * Detection Rule 4: Holding Pattern Increase
   * Detects wallets increasing their holdings
   */
  private async detectHoldingPatterns(context: DetectionContext): Promise<number> {
    const { transactions, walletPositions } = context;

    // Calculate net change for each wallet
    const walletChanges = new Map<string, number>();
    
    transactions.forEach((tx) => {
      // Inflow
      if (tx.toAddress) {
        const current = walletChanges.get(tx.toAddress) || 0;
        walletChanges.set(tx.toAddress, current + Number(tx.amount));
      }
      // Outflow
      if (tx.fromAddress) {
        const current = walletChanges.get(tx.fromAddress) || 0;
        walletChanges.set(tx.fromAddress, current - Number(tx.amount));
      }
    });

    // Count wallets with significant positive change
    const increasingWallets = Array.from(walletChanges.values())
      .filter((change) => change > 1000) // Threshold
      .length;

    let score = 0;
    if (increasingWallets >= 10) score += 40;
    if (increasingWallets >= 20) score += 30;
    if (increasingWallets >= 50) score += 30;

    return Math.min(100, score);
  }

  /**
   * Detection Rule 5: Transaction Volume Spike
   * Detects sudden increase in transaction volume
   */
  private async detectVolumeSpike(context: DetectionContext): Promise<number> {
    const { transactions } = context;

    // Calculate total volume
    const totalVolume = transactions.reduce((sum, tx) => {
      return sum + Number(tx.amount);
    }, 0);

    // Get average volume from previous period (simplified - in production, compare with historical)
    // For now, score based on absolute volume
    let score = 0;
    if (totalVolume > 100000) score += 30;
    if (totalVolume > 500000) score += 30;
    if (totalVolume > 1000000) score += 40;

    // Also consider transaction count
    if (transactions.length > 50) score += 20;
    if (transactions.length > 100) score += 20;

    return Math.min(100, score);
  }

  /**
   * Detection Rule 6: DEX Liquidity Increase
   * Detects significant liquidity pool additions (mints) via The Graph
   */
  private async detectDexLiquidityIncrease(context: DetectionContext): Promise<number> {
    const { tokenId, timeWindow } = context;

    try {
      // Get LP change events (mints) in the time window
      const lpChanges = await this.prisma.lpChangeEvent.findMany({
        where: {
          tokenId,
          changeType: 'mint', // Only mints (liquidity additions)
          timestamp: {
            gte: timeWindow.start,
            lte: timeWindow.end,
          },
        },
      });

      if (lpChanges.length === 0) {
        return 0;
      }

      // Calculate total liquidity added
      const totalLiquidityUSD = lpChanges.reduce((sum, change) => {
        const amountUSD = change.amountUSD ? Number(change.amountUSD) : 0;
        return sum + amountUSD;
      }, 0);

      // Score based on liquidity added
      let score = 0;
      if (totalLiquidityUSD > 50000) score += 30; // $50k+
      if (totalLiquidityUSD > 100000) score += 30; // $100k+
      if (totalLiquidityUSD > 500000) score += 40; // $500k+

      // Also consider number of LP additions (multiple adds = strong signal)
      if (lpChanges.length >= 3) score += 20;
      if (lpChanges.length >= 5) score += 20;

      return Math.min(100, score);
    } catch (error) {
      this.logger.warn(`Failed to detect DEX liquidity increase: ${error.message}`);
      return 0;
    }
  }

  /**
   * Detection Rule 7: Repeated Large Swaps
   * Detects multiple large swaps from the same wallet or multiple wallets (accumulation pattern)
   */
  private async detectRepeatedLargeSwaps(context: DetectionContext): Promise<number> {
    const { tokenId, timeWindow } = context;

    try {
      // Get large swap events in the time window
      const swaps = await this.prisma.dexSwapEvent.findMany({
        where: {
          tokenId,
          swapType: 'buy', // Only buy swaps (accumulation)
          timestamp: {
            gte: timeWindow.start,
            lte: timeWindow.end,
          },
        },
      });

      if (swaps.length === 0) {
        return 0;
      }

      // Filter for large swaps (>$10k)
      const largeSwaps = swaps.filter((swap) => {
        const amountIn = Number(swap.amountIn);
        const amountOut = Number(swap.amountOut);
        // Estimate USD value (simplified - in production, use price data)
        const estimatedValue = Math.max(amountIn, amountOut);
        return estimatedValue > 10000;
      });

      if (largeSwaps.length === 0) {
        return 0;
      }

      // Count unique wallets making large swaps
      const uniqueWallets = new Set(
        largeSwaps.map((swap) => swap.walletAddress).filter(Boolean),
      );

      // Score based on number of large swaps and unique wallets
      let score = 0;
      
      // Multiple large swaps = strong signal
      if (largeSwaps.length >= 3) score += 30;
      if (largeSwaps.length >= 5) score += 30;
      if (largeSwaps.length >= 10) score += 40;

      // Multiple unique wallets = accumulation pattern
      if (uniqueWallets.size >= 3) score += 20;
      if (uniqueWallets.size >= 5) score += 20;

      return Math.min(100, score);
    } catch (error) {
      this.logger.warn(`Failed to detect repeated large swaps: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if an address is likely an exchange
   * This is a simplified check - in production, use a known exchange address list
   */
  private isExchangeAddress(address: string): boolean {
    // Simplified: check if address appears frequently (exchanges have many transactions)
    // In production, maintain a list of known exchange addresses
    return false; // Placeholder
  }

  /**
   * Create an accumulation signal
   */
  private async createSignal(
    tokenId: string,
    score: number,
    windowStart: Date,
    windowEnd: Date,
    windowLabel: string,
  ): Promise<void> {
    try {
      // Ensure token exists before creating signal
      let token = await this.prisma.token.findUnique({
        where: { id: tokenId },
      });

      if (!token) {
        // Token doesn't exist, try to get token info from transactions
        const sampleTransaction = await this.prisma.transaction.findFirst({
          where: { tokenId },
          include: { token: true },
        });

        if (!sampleTransaction) {
          this.logger.warn(
            `Cannot create signal: Token ${tokenId} does not exist and no transactions found`,
          );
          return;
        }

        // Try to get token info from transaction raw data or create with defaults
        const rawData = sampleTransaction.raw as any;
        const tokenSymbol = rawData?.tokenSymbol || rawData?.symbol || 'UNKNOWN';
        const tokenName = rawData?.tokenName || rawData?.name || 'Unknown Token';
        const chain = rawData?.chain || 'ethereum';
        const contractAddress = rawData?.contractAddress || rawData?.address || '0x0000000000000000000000000000000000000000';
        const decimals = rawData?.decimals || 18;

        try {
          token = await this.prisma.token.create({
            data: {
              id: tokenId,
              chain,
              symbol: tokenSymbol,
              name: tokenName,
              contractAddress,
              decimals,
              active: true,
              metadata: {
                createdFromSignal: true,
                detectedAt: new Date().toISOString(),
              },
            },
          });
          this.logger.log(
            `Created missing token ${tokenId} (${tokenSymbol}) from signal detection`,
          );
        } catch (createError: any) {
          // If creation fails (e.g., ID already exists), try to fetch it
          if (createError.code === 'P2002') {
            token = await this.prisma.token.findUnique({
              where: { id: tokenId },
            });
          } else {
            this.logger.warn(
              `Failed to create token ${tokenId}: ${createError.message}`,
            );
            return;
          }
        }
      }

      // Get wallets involved in the time window
      const transactions = await this.prisma.transaction.findMany({
        where: {
          tokenId,
          timestamp: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        select: {
          toAddress: true,
          fromAddress: true,
        },
        distinct: ['toAddress', 'fromAddress'],
      });

      const walletsInvolved = Array.from(
        new Set([
          ...transactions.map((t) => t.toAddress).filter(Boolean),
          ...transactions.map((t) => t.fromAddress).filter(Boolean),
        ]),
      );

      // Determine signal type based on score and patterns
      let signalType: SignalType = SignalType.CONCENTRATED_BUYS;
      if (score >= this.whaleInflowThreshold) {
        signalType = SignalType.WHALE_INFLOW;
      } else if (score >= this.concentratedBuysThreshold) {
        signalType = SignalType.CONCENTRATED_BUYS;
      }

      // Check if signal already exists for this window (avoid duplicates)
      const existing = await this.prisma.accumulationSignal.findFirst({
        where: {
          tokenId,
          windowStart: {
            gte: new Date(windowStart.getTime() - 60000), // 1 minute tolerance
            lte: new Date(windowStart.getTime() + 60000),
          },
          windowEnd: {
            gte: new Date(windowEnd.getTime() - 60000),
            lte: new Date(windowEnd.getTime() + 60000),
          },
        },
      });

      if (existing) {
        // Update existing signal if score is higher
        if (score > Number(existing.score)) {
          await this.prisma.accumulationSignal.update({
            where: { id: existing.id },
            data: {
              score: score.toFixed(2),
              signalType,
              walletsInvolved: walletsInvolved as any,
              metadata: {
                window: windowLabel,
                updatedAt: new Date().toISOString(),
              },
            },
          });
          this.logger.debug(`Updated signal ${existing.id} with higher score ${score}`);
        }
        return;
      }

      // Create new signal
      const newSignal = await this.signalsService.create({
        token: { connect: { id: tokenId } },
        score: score.toFixed(2),
        signalType,
        windowStart,
        windowEnd,
        walletsInvolved: walletsInvolved as any,
        metadata: {
          window: windowLabel,
          detectedAt: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Created accumulation signal for token ${tokenId} with score ${score.toFixed(2)}`,
      );

      // Create and dispatch alerts for this signal
      if (score >= 75) {
        // Only create alerts for high-score signals
        try {
          await this.alertDispatcher.createAlertsForSignal(newSignal.id);
          await this.alertDispatcher.dispatchAlertsForSignal(newSignal.id);
        } catch (error) {
          this.logger.warn(`Failed to create/dispatch alerts for signal ${newSignal.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create signal: ${error.message}`, error.stack);
      throw error;
    }
  }
}

