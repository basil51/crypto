import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create feedback
   */
  async create(userId: string, data: {
    type: string;
    title: string;
    description: string;
    priority?: string;
    metadata?: any;
  }) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        ...data,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Feedback created: ${feedback.id} by user ${userId}`);
    return feedback;
  }

  /**
   * Get all feedback (Admin only)
   */
  async findAll(filters?: {
    status?: string;
    type?: string;
    userId?: string;
  }) {
    const where: Prisma.FeedbackWhereInput = {};
    
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user's own feedback
   */
  async findByUser(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get feedback by ID
   */
  async findOne(id: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  /**
   * Update feedback status (Admin only)
   */
  async updateStatus(id: string, status: string, priority?: string) {
    const updateData: Prisma.FeedbackUpdateInput = { status };
    if (priority) {
      updateData.priority = priority;
    }

    return this.prisma.feedback.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get feedback statistics
   */
  async getStatistics() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.feedback.count(),
      this.prisma.feedback.count({ where: { status: 'OPEN' } }),
      this.prisma.feedback.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.feedback.count({ where: { status: 'RESOLVED' } }),
      this.prisma.feedback.count({ where: { status: 'CLOSED' } }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }
}

