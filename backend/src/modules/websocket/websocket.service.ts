import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { Logger } from '@nestjs/common';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  constructor(
    @Inject(forwardRef(() => WebSocketGateway))
    private gateway: WebSocketGateway,
  ) {}

  /**
   * Emit notification when alert is created
   */
  async emitNewNotification(userId: string, notification: any) {
    this.gateway.emitNotification(userId, notification);
    this.logger.debug(`Emitted notification to user ${userId}`);
  }

  /**
   * Emit dashboard update
   */
  async emitDashboardUpdate(userId: string, data: any) {
    this.gateway.emitDashboardUpdate(userId, data);
    this.logger.debug(`Emitted dashboard update to user ${userId}`);
  }

  /**
   * Emit orderbook update
   */
  async emitOrderbookUpdate(symbol: string, exchange: string, data: any) {
    this.gateway.emitOrderbookUpdate(symbol, exchange, data);
    this.logger.debug(`Emitted orderbook update for ${symbol} on ${exchange}`);
  }

  /**
   * Emit whale transaction
   */
  async emitWhaleTransaction(data: any) {
    this.gateway.emitWhaleTransaction(data);
    this.logger.debug('Emitted whale transaction');
  }

  /**
   * Emit signal update
   */
  async emitSignalUpdate(data: any) {
    this.gateway.emitSignalUpdate(data);
    this.logger.debug('Emitted signal update');
  }
}

