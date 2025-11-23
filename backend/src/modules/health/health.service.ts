import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: await this.checkDatabase(),
      uptime: process.uptime(),
    };

    const isHealthy = checks.database.status === 'ok';

    return {
      ...checks,
      status: isHealthy ? 'ok' : 'error',
    };
  }

  async ready() {
    const dbReady = await this.checkDatabase();
    const isReady = dbReady.status === 'ok';

    return {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      database: dbReady,
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        message: 'Database connection successful',
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }
}

