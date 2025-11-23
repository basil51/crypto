import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireSubscription } from '../billing/decorators/require-subscription.decorator';

@Controller('dashboards')
@UseGuards(JwtAuthGuard)
@RequireSubscription() // Pro feature
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Post()
  async create(@Request() req: any, @Body() createDashboardDto: any) {
    return this.dashboardsService.create(req.user.userId, createDashboardDto);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.dashboardsService.findAll(req.user.userId);
  }

  @Get('default')
  async findDefault(@Request() req: any) {
    return this.dashboardsService.findDefault(req.user.userId);
  }

  @Get('templates')
  async getTemplates(@Request() req: any, @Body() body?: { category?: string }) {
    return this.dashboardsService.getTemplates(body?.category);
  }

  @Post('from-template/:templateId')
  async createFromTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() body?: { name?: string },
  ) {
    return this.dashboardsService.createFromTemplate(req.user.userId, templateId, body?.name);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.dashboardsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDashboardDto: any,
  ) {
    return this.dashboardsService.update(id, req.user.userId, updateDashboardDto);
  }

  @Patch(':id/set-default')
  async setDefault(@Request() req: any, @Param('id') id: string) {
    return this.dashboardsService.setDefault(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.dashboardsService.remove(id, req.user.userId);
  }

  @Post(':id/widgets')
  async addWidget(
    @Request() req: any,
    @Param('id') dashboardId: string,
    @Body() addWidgetDto: any,
  ) {
    return this.dashboardsService.addWidget(dashboardId, req.user.userId, addWidgetDto);
  }

  @Patch('widgets/:widgetId')
  async updateWidget(
    @Request() req: any,
    @Param('widgetId') widgetId: string,
    @Body() updateWidgetDto: any,
  ) {
    return this.dashboardsService.updateWidget(widgetId, req.user.userId, updateWidgetDto);
  }

  @Delete('widgets/:widgetId')
  async removeWidget(@Request() req: any, @Param('widgetId') widgetId: string) {
    return this.dashboardsService.removeWidget(widgetId, req.user.userId);
  }
}

