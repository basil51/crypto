import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IngestionService } from './services/ingestion.service';
import { PositionsService } from './services/positions.service';
import { DetectionService } from './services/detection.service';

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
   * Run accumulation detection
   * Runs every 10 minutes
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async runDetection() {
    if (this.isRunningDetection) {
      this.logger.warn('Detection worker already in progress, skipping...');
      return;
    }

    this.isRunningDetection = true;
    try {
      await this.detectionService.runDetection();
    } catch (error) {
      this.logger.error(`Detection worker job failed: ${error.message}`, error.stack);
    } finally {
      this.isRunningDetection = false;
    }
  }
}

