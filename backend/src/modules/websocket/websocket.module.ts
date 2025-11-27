import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [JwtModule, ConfigModule, PrismaModule],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketGateway, WebSocketService],
})
export class WebSocketModule {}

