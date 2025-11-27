import { Controller, Post, UseGuards, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Manually trigger transaction ingestion
   */
  @Post('ingest')
  async triggerIngestion() {
    await this.jobsService.ingestTransactions();
    return {
      success: true,
      message: 'Transaction ingestion triggered',
    };
  }

  /**
   * Manually trigger detection
   */
  @Post('detect')
  async triggerDetection() {
    await this.jobsService.runDetection();
    return {
      success: true,
      message: 'Detection triggered',
    };
  }

  /**
   * Manually trigger token discovery
   */
  @Post('discover')
  async triggerDiscovery() {
    await this.jobsService.discoverTokens();
    return {
      success: true,
      message: 'Token discovery triggered',
    };
  }

  /**
   * Manually trigger broad monitoring
   * This will scan for whale activity across ALL tokens
   */
  @Post('broad-monitoring')
  async triggerBroadMonitoring() {
    await this.jobsService.runBroadMonitoring();
    return {
      success: true,
      message: 'Broad monitoring triggered',
    };
  }

  /**
   * Get job status
   */
  @Get('status')
  async getJobStatus() {
    return {
      success: true,
      message: 'Jobs are running on schedule',
      jobs: {
        ingestion: 'Every 5 minutes',
        detection: 'Every 10 minutes',
        discovery: 'Every 15 minutes',
        broadMonitoring: 'Every 30 minutes',
        positionUpdates: 'Every hour',
      },
    };
  }
}

