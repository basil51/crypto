import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IngestionService } from './services/ingestion.service';
import { PositionsService } from './services/positions.service';
import { DetectionService } from './services/detection.service';
import { TokenDiscoveryService } from './services/token-discovery.service';
import { BroadMonitoringService } from '../alerts/services/broad-monitoring.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private isIngesting = false;
  private isUpdatingPositions = false;
  private isRunningDetection = false;
  private isBroadMonitoring = false;
  private isIngestingWhaleEvents = false;
  private isIngestingDexSwaps = false;
  private isIngestingLpChanges = false;
  private isIngestingSolanaTransactions = false;

  constructor(
    private ingestionService: IngestionService,
    private positionsService: PositionsService,
    private detectionService: DetectionService,
    private tokenDiscoveryService: TokenDiscoveryService,
    @Optional() private broadMonitoringService?: BroadMonitoringService,
  ) {}

  /**
   * Process pending alerts
   * Runs every 2 minutes
   */
  @Cron('*/2 * * * *') // Every 2 minutes
  async processPendingAlerts() {
    // This will be handled by AlertDispatcherService if needed
    // For now, alerts are dispatched immediately when signals are created
  }

  /**
   * Ingest transactions from external APIs
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async ingestTransactions() {
    if (this.isIngesting) {
      this.logger.warn('Transaction ingestion already in progress, skipping...');
      return;
    }

    this.isIngesting = true;
    try {
      await this.ingestionService.ingestTransactions();
    } catch (error) {
      this.logger.error(`Transaction ingestion job failed: ${error.message}`, error.stack);
    } finally {
      this.isIngesting = false;
    }
  }

  /**
   * Update wallet positions
   * Runs every hour
   */
  @Cron('0 * * * *') // Every hour
  async updateWalletPositions() {
    if (this.isUpdatingPositions) {
      this.logger.warn('Wallet position update already in progress, skipping...');
      return;
    }

    this.isUpdatingPositions = true;
    try {
      await this.positionsService.updateWalletPositions();
    } catch (error) {
      this.logger.error(`Wallet position update job failed: ${error.message}`, error.stack);
    } finally {
      this.isUpdatingPositions = false;
    }
  }

  /**
   * Discover new tokens from DEXs and external sources
   * Runs every 15 minutes - discovers tokens BEFORE detection runs
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async discoverTokens() {
    try {
      this.logger.log('Running token discovery...');
      const result = await this.tokenDiscoveryService.runDiscovery();
      this.logger.log(`Token discovery completed: ${result.discovered} discovered, ${result.added} added`);
    } catch (error) {
      this.logger.error(`Token discovery job failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Run accumulation detection
   * Runs every 10 minutes
   * Now processes ALL tokens in database (including newly discovered ones)
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async runDetection() {
    if (this.isRunningDetection) {
      this.logger.warn('Detection worker already in progress, skipping...');
      return;
    }

    this.isRunningDetection = true;
    try {
      // First, run a quick discovery to catch any new tokens
      // This ensures we detect signals for tokens discovered since last run
      try {
        const discoveryResult = await this.tokenDiscoveryService.runDiscovery();
        if (discoveryResult.added > 0) {
          this.logger.log(`Discovered ${discoveryResult.added} new tokens before detection`);
        }
      } catch (error) {
        this.logger.warn(`Quick discovery before detection failed: ${error.message}`);
        // Continue with detection even if discovery fails
      }

      // Then run detection on ALL tokens (including newly discovered ones)
      await this.detectionService.runDetection();
    } catch (error) {
      this.logger.error(`Detection worker job failed: ${error.message}`, error.stack);
    } finally {
      this.isRunningDetection = false;
    }
  }

  /**
   * Monitor all tokens for whale activity (broad monitoring)
   * Runs every 30 minutes to catch whale movements on ANY token
   * This creates alerts for PRO users without requiring specific token subscriptions
   */
  @Cron('*/30 * * * *') // Every 30 minutes
  async runBroadMonitoring() {
    if (this.isBroadMonitoring) {
      this.logger.warn('Broad monitoring already in progress, skipping...');
      return;
    }

    if (!this.broadMonitoringService) {
      this.logger.debug('BroadMonitoringService not available, skipping broad monitoring');
      return;
    }

    this.isBroadMonitoring = true;
    try {
      this.logger.log('🔍 Starting broad monitoring job...');
      const result = await this.broadMonitoringService.monitorAllTokens();
      this.logger.log(
        `✅ Broad monitoring completed: ${result.processed} transfers processed, ` +
        `${result.alertsCreated} alerts created, ${result.newTokensDiscovered} new tokens discovered`
      );
    } catch (error) {
      this.logger.error(`Broad monitoring job failed: ${error.message}`, error.stack);
    } finally {
      this.isBroadMonitoring = false;
    }
  }

  /**
   * Ingest whale events from Covalent
   * Runs every 15 minutes to store large transfers as WhaleEvent records
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async ingestWhaleEvents() {
    if (this.isIngestingWhaleEvents) {
      this.logger.warn('Whale event ingestion already in progress, skipping...');
      return;
    }

    this.isIngestingWhaleEvents = true;
    try {
      await this.ingestionService.ingestWhaleEvents();
    } catch (error) {
      this.logger.error(`Whale event ingestion job failed: ${error.message}`, error.stack);
    } finally {
      this.isIngestingWhaleEvents = false;
    }
  }

  /**
   * Ingest DEX swap events from The Graph
   * Runs every 20 minutes to store large swaps as DexSwapEvent records
   */
  @Cron('*/20 * * * *') // Every 20 minutes
  async ingestDexSwaps() {
    if (this.isIngestingDexSwaps) {
      this.logger.warn('DEX swap ingestion already in progress, skipping...');
      return;
    }

    this.isIngestingDexSwaps = true;
    try {
      await this.ingestionService.ingestDexSwaps();
    } catch (error) {
      this.logger.error(`DEX swap ingestion job failed: ${error.message}`, error.stack);
    } finally {
      this.isIngestingDexSwaps = false;
    }
  }

  /**
   * Ingest LP change events from The Graph
   * Runs every 30 minutes to store liquidity pool mints/burns as LpChangeEvent records
   */
  @Cron('*/30 * * * *') // Every 30 minutes
  async ingestLpChanges() {
    if (this.isIngestingLpChanges) {
      this.logger.warn('LP change ingestion already in progress, skipping...');
      return;
    }

    this.isIngestingLpChanges = true;
    try {
      await this.ingestionService.ingestLpChanges();
    } catch (error) {
      this.logger.error(`LP change ingestion job failed: ${error.message}`, error.stack);
    } finally {
      this.isIngestingLpChanges = false;
    }
  }

  /**
   * Ingest Solana transactions from QuickNode
   * Runs every 10 minutes to store Solana token transfers as Transaction records
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async ingestSolanaTransactions() {
    if (this.isIngestingSolanaTransactions) {
      this.logger.warn('Solana transaction ingestion already in progress, skipping...');
      return;
    }

    this.isIngestingSolanaTransactions = true;
    try {
      await this.ingestionService.ingestSolanaTransactions();
    } catch (error) {
      this.logger.error(`Solana transaction ingestion job failed: ${error.message}`, error.stack);
    } finally {
      this.isIngestingSolanaTransactions = false;
    }
  }
}

