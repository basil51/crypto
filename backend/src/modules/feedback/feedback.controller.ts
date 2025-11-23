import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create feedback
   */
  @Post()
  async create(@Request() req: any, @Body() body: {
    type: string;
    title: string;
    description: string;
    priority?: string;
    metadata?: any;
  }) {
    return this.feedbackService.create(req.user.userId, body);
  }

  /**
   * Get all feedback (Admin only)
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    const user = await this.getUserFromRequest(req);
    
    // If not admin, only return user's own feedback
    if (user.role !== UserRole.ADMIN) {
      return this.feedbackService.findByUser(user.id);
    }

    return this.feedbackService.findAll({ status, type, userId });
  }

  /**
   * Get user's own feedback
   */
  @Get('my')
  async getMyFeedback(@Request() req: any) {
    return this.feedbackService.findByUser(req.user.userId);
  }

  /**
   * Get feedback by ID
   */
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const user = await this.getUserFromRequest(req);
    const feedback = await this.feedbackService.findOne(id);

    // Users can only view their own feedback unless they're admin
    if (user.role !== UserRole.ADMIN && feedback.userId !== user.id) {
      throw new ForbiddenException('You can only view your own feedback');
    }

    return feedback;
  }

  /**
   * Update feedback status (Admin only)
   */
  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; priority?: string },
  ) {
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update feedback status');
    }

    return this.feedbackService.updateStatus(id, body.status, body.priority);
  }

  /**
   * Get feedback statistics (Admin only)
   */
  @Get('statistics/summary')
  async getStatistics(@Request() req: any) {
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view statistics');
    }

    return this.feedbackService.getStatistics();
  }

  private async getUserFromRequest(req: any) {
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return user;
  }
}

