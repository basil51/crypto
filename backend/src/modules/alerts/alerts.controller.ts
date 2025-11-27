import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Prisma } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body() createAlertDto: CreateAlertDto) {
    try {
      const data: Prisma.AlertCreateInput = {
        channels: createAlertDto.channels,
        status: (createAlertDto.status as any) || 'PENDING',
        user: { connect: { id: createAlertDto.userId } },
        signal: { connect: { id: createAlertDto.signalId } },
      };
      return await this.alertsService.create(data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new BadRequestException('User or Signal not found');
      }
      throw error;
    }
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Request() req?: any) {
    // If userId is not provided, use authenticated user's ID
    const effectiveUserId = userId || req.user?.userId;
    if (!effectiveUserId) {
      throw new BadRequestException('User ID is required');
    }
    return this.alertsService.findAll({ userId: effectiveUserId });
  }

  @Get('my-notifications')
  async getMyNotifications(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const unreadOnlyBool = unreadOnly === 'true';

    return this.alertsService.getUserNotifications(userId, limitNum, unreadOnlyBool);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.alertsService.getUnreadCount(userId);
    return { count };
  }

  @Get('my-subscriptions')
  async getMySubscriptions(@Request() req: any) {
    return this.alertsService.getUserSubscriptions(req.user.userId);
  }

  @Patch(':id/mark-read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    
    // Verify the alert belongs to the user
    const alert = await this.alertsService.findOne(id);
    if (!alert || alert.userId !== userId) {
      throw new NotFoundException('Alert not found');
    }

    return this.alertsService.markAsRead(id);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.userId;
    return this.alertsService.markAllAsRead(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertsService.findOne(id);
    
    // Verify the alert belongs to the authenticated user
    if (!alert || alert.userId !== req.user.userId) {
      throw new NotFoundException('Alert not found');
    }
    
    return alert;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ) {
    // Verify the alert belongs to the authenticated user
    const alert = await this.alertsService.findOne(id);
    if (!alert || alert.userId !== req.user.userId) {
      throw new NotFoundException('Alert not found');
    }

    return this.alertsService.update(id, updateData);
  }

  @Post('subscribe')
  async subscribeToToken(
    @Request() req: any,
    @Body() body: { tokenId: string; channels: { telegram?: boolean; email?: boolean } },
  ) {
    return this.alertsService.subscribeToToken(req.user.userId, body.tokenId, body.channels);
  }

  @Post('unsubscribe')
  async unsubscribeFromToken(
    @Request() req: any,
    @Body() body: { tokenId: string },
  ) {
    return this.alertsService.unsubscribeFromToken(req.user.userId, body.tokenId);
  }
}
