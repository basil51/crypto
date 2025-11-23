import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.check();
  }

  @Get('ready')
  async ready() {
    return this.healthService.ready();
  }

  @Get('live')
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

