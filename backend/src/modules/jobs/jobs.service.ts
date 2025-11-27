import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IngestionService } from './services/ingestion.service';
import { PositionsService } from './services/positions.service';
import { DetectionService } from './services/detection.service';
import { TokenDiscoveryService } from './services/token-discovery.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private isIngesting = false;
  private isUpdatingPositions = false;
  private isRunningDetection = false;

  constructor(
    private ingestionService: IngestionService,
    private positionsService: PositionsService,
    private detectionService: DetectionService,
    private tokenDiscoveryService: TokenDiscoveryService,
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
}

