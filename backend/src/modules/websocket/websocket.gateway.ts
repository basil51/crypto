import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
}

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  path: '/ws',
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private clients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, request: any) {
    try {
      // Extract token from query string
      // The request object structure may vary, try multiple approaches
      let token: string | null = null;
      
      if (request.url) {
        try {
          const urlObj = new URL(request.url, 'ws://localhost:3001');
          token = urlObj.searchParams.get('token');
        } catch (e) {
          // If URL parsing fails, try extracting from headers or query directly
          const urlString = typeof request.url === 'string' ? request.url : '';
          const match = urlString.match(/[?&]token=([^&]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }
      
      // Also check headers as fallback
      if (!token && request.headers) {
        const authHeader = request.headers.authorization || request.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-here';
      const payload = this.jwtService.verify(token, { secret });

      // Attach user info to socket
      client.userId = payload.sub;
      client.isAuthenticated = true;

      // Store client
      this.clients.set(client.userId, client);

      this.logger.log(`Client authenticated: ${client.userId}`);

      // Send welcome message
      this.sendToClient(client.userId, {
        type: 'connected',
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token - ${error.message}`);
      client.close(1008, 'Invalid authentication token');
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.clients.delete(client.userId);
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    if (!client.isAuthenticated) {
      return { type: 'error', message: 'Not authenticated' };
    }

    this.logger.log(`Client ${client.userId} subscribed to: ${data.channels.join(', ')}`);

    return {
      type: 'subscribed',
      channels: data.channels,
      timestamp: new Date().toISOString(),
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    if (!client.isAuthenticated) {
      return { type: 'error', message: 'Not authenticated' };
    }

    this.logger.log(`Client ${client.userId} unsubscribed from: ${data.channels.join(', ')}`);

    return {
      type: 'unsubscribed',
      channels: data.channels,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send message to specific client
   */
  sendToClient(userId: string, data: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(data: any) {
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  /**
   * Broadcast to authenticated clients only
   */
  broadcastToAuthenticated(data: any) {
    this.clients.forEach((client, userId) => {
      if (client.isAuthenticated && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  /**
   * Emit dashboard update
   */
  emitDashboardUpdate(userId: string, data: any) {
    this.sendToClient(userId, {
      type: 'dashboard_update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit notification to user
   */
  emitNotification(userId: string, notification: any) {
    this.sendToClient(userId, {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit orderbook update
   */
  emitOrderbookUpdate(symbol: string, exchange: string, data: any) {
    this.broadcastToAuthenticated({
      type: 'orderbook_update',
      symbol,
      exchange,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit whale transaction
   */
  emitWhaleTransaction(data: any) {
    this.broadcastToAuthenticated({
      type: 'whale_transaction',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit signal update
   */
  emitSignalUpdate(data: any) {
    this.broadcastToAuthenticated({
      type: 'signal_update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

