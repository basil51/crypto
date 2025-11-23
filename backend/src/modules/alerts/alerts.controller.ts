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
    const where: Prisma.AlertWhereInput = {};
    if (userId) where.userId = userId;
    else if (req?.user) where.userId = req.user.userId;
    // If no userId specified and no user in request, return empty or throw error
    if (!userId && !req?.user) {
      throw new BadRequestException('User ID required');
    }
    return this.alertsService.findAll(where);
  }

  // Specific routes must come before parameterized routes
  @Get('my-subscriptions')
  async getMySubscriptions(@Request() req: any) {
    if (!req.user?.userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.alertsService.getUserSubscriptions(req.user.userId);
  }

  @Post('subscribe')
  async subscribe(@Body() body: { tokenId: string; channels: { telegram?: boolean; email?: boolean } }, @Request() req: any) {
    if (!req.user?.userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.alertsService.subscribeToToken(req.user.userId, body.tokenId, body.channels);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: { tokenId: string }, @Request() req: any) {
    if (!req.user?.userId) {
      throw new BadRequestException('User not authenticated');
    }
    await this.alertsService.unsubscribeFromToken(req.user.userId, body.tokenId);
    return { message: 'Unsubscribed successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const alert = await this.alertsService.findOne(id);
    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }
    return alert;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAlertDto: Partial<CreateAlertDto>) {
    try {
      return await this.alertsService.update(id, updateAlertDto as Prisma.AlertUpdateInput);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Alert with ID ${id} not found`);
      }
      throw error;
    }
  }
}

