import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /**
   * Public endpoint for homepage statistics
   */
  @Get('public/stats')
  async getHomepageStats() {
    return this.appService.getHomepageStats();
  }

  /**
   * Public endpoint for top accumulating tokens
   */
  @Get('public/top-tokens')
  async getTopAccumulatingTokens(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.appService.getTopAccumulatingTokens(limit);
  }

  /**
   * Public endpoint for recent whale transactions
   */
  @Get('public/whale-transactions')
  async getRecentWhaleTransactions(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.appService.getRecentWhaleTransactions(limit);
  }

  /**
   * Dashboard endpoint: Smart Money Wallets Leaderboard
   */
  @Get('dashboard/smart-money-leaderboard')
  async getSmartMoneyLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.appService.getSmartMoneyLeaderboard(limit);
  }

  /**
   * Dashboard endpoint: New Born Tokens (created in last 30 min with whale buys)
   */
  @Get('dashboard/new-born-tokens')
  async getNewBornTokens(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.appService.getNewBornTokens(limit);
  }

  /**
   * Dashboard endpoint: Top Gainers Prediction
   */
  @Get('dashboard/top-gainers')
  async getTopGainers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.appService.getTopGainers(limit);
  }
}

