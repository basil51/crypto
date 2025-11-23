import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new dashboard for a user
   */
  async create(userId: string, data: {
    name: string;
    description?: string;
    layout?: any;
    templateId?: string;
    metadata?: any;
  }) {
    // If this is the first dashboard, make it default
    const existingDashboards = await this.prisma.dashboard.count({
      where: { userId },
    });

    return this.prisma.dashboard.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        layout: data.layout || { columns: 12, rows: [] },
        isDefault: existingDashboards === 0,
        templateId: data.templateId,
        metadata: data.metadata,
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Get all dashboards for a user
   */
  async findAll(userId: string) {
    return this.prisma.dashboard.findMany({
      where: { userId },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a specific dashboard
   */
  async findOne(id: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, userId },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return dashboard;
  }

  /**
   * Get default dashboard for a user
   */
  async findDefault(userId: string) {
    let dashboard = await this.prisma.dashboard.findFirst({
      where: { userId, isDefault: true },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // If no default, get the first one or create a default
    if (!dashboard) {
      dashboard = await this.prisma.dashboard.findFirst({
        where: { userId },
        include: {
          widgets: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (dashboard) {
        // Make it default
        dashboard = await this.prisma.dashboard.update({
          where: { id: dashboard.id },
          data: { isDefault: true },
          include: {
            widgets: {
              orderBy: { order: 'asc' },
            },
          },
        });
      } else {
        // Create a default dashboard
        dashboard = await this.create(userId, {
          name: 'My Dashboard',
          description: 'Default dashboard',
        });
      }
    }

    return dashboard;
  }

  /**
   * Update a dashboard
   */
  async update(id: string, userId: string, data: {
    name?: string;
    description?: string;
    layout?: any;
    metadata?: any;
  }) {
    // Verify ownership
    const existing = await this.prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.prisma.dashboard.update({
      where: { id },
      data,
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Set a dashboard as default
   */
  async setDefault(id: string, userId: string) {
    // Verify ownership
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Unset all other defaults
    await this.prisma.dashboard.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.dashboard.update({
      where: { id },
      data: { isDefault: true },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a dashboard
   */
  async remove(id: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Don't allow deleting the default dashboard if it's the only one
    if (dashboard.isDefault) {
      const count = await this.prisma.dashboard.count({ where: { userId } });
      if (count === 1) {
        throw new BadRequestException('Cannot delete the only dashboard');
      }
    }

    await this.prisma.dashboard.delete({ where: { id } });

    // If this was the default, set another one as default
    if (dashboard.isDefault) {
      const nextDashboard = await this.prisma.dashboard.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (nextDashboard) {
        await this.prisma.dashboard.update({
          where: { id: nextDashboard.id },
          data: { isDefault: true },
        });
      }
    }
  }

  /**
   * Add a widget to a dashboard
   */
  async addWidget(dashboardId: string, userId: string, data: {
    widgetType: string;
    position: { x: number; y: number; w: number; h: number };
    config?: any;
    order?: number;
  }) {
    // Verify ownership
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, userId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Get max order
    const maxOrder = await this.prisma.dashboardWidget.aggregate({
      where: { dashboardId },
      _max: { order: true },
    });

    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        widgetType: data.widgetType,
        position: data.position,
        config: data.config,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });
  }

  /**
   * Update a widget
   */
  async updateWidget(widgetId: string, userId: string, data: {
    position?: { x: number; y: number; w: number; h: number };
    config?: any;
    order?: number;
  }) {
    // Verify ownership through dashboard
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId },
      include: { dashboard: true },
    });

    if (!widget || widget.dashboard.userId !== userId) {
      throw new NotFoundException('Widget not found');
    }

    return this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data,
    });
  }

  /**
   * Remove a widget
   */
  async removeWidget(widgetId: string, userId: string) {
    // Verify ownership
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId },
      include: { dashboard: true },
    });

    if (!widget || widget.dashboard.userId !== userId) {
      throw new NotFoundException('Widget not found');
    }

    await this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
  }

  /**
   * Get available dashboard templates
   */
  async getTemplates(category?: string) {
    return this.prisma.dashboardTemplate.findMany({
      where: {
        isPublic: true,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a dashboard from a template
   */
  async createFromTemplate(userId: string, templateId: string, name?: string) {
    const template = await this.prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const dashboard = await this.create(userId, {
      name: name || template.name,
      description: template.description,
      layout: template.layout,
      templateId: template.id,
    });

    // Create widgets from template
    const widgets = template.widgets as any[];
    if (Array.isArray(widgets)) {
      for (const widget of widgets) {
        await this.addWidget(dashboard.id, userId, {
          widgetType: widget.widgetType,
          position: widget.position,
          config: widget.config,
          order: widget.order,
        });
      }
    }

    return this.findOne(dashboard.id, userId);
  }
}

