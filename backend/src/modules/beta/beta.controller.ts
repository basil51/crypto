import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { BetaService } from './beta.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@Controller('beta')
@UseGuards(JwtAuthGuard)
export class BetaController {
  constructor(
    private readonly betaService: BetaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create beta invitation (Admin only)
   */
  @Post('invitations')
  async createInvitation(
    @Request() req: any,
    @Body() body: { email: string },
  ) {
    // Check if user is admin
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create beta invitations');
    }

    return this.betaService.createInvitation(user.id, body.email);
  }

  /**
   * Get all invitations (Admin only)
   */
  @Get('invitations')
  async getInvitations(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view invitations');
    }

    return this.betaService.getInvitations(status);
  }

  /**
   * Get invitation by code (public, for registration)
   */
  @Get('invitations/code/:code')
  async getInvitationByCode(@Param('code') code: string) {
    return this.betaService.getInvitationByCode(code);
  }

  /**
   * Revoke invitation (Admin only)
   */
  @Delete('invitations/:id')
  async revokeInvitation(@Request() req: any, @Param('id') id: string) {
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can revoke invitations');
    }

    await this.betaService.revokeInvitation(id);
    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Get beta statistics (Admin only)
   */
  @Get('statistics')
  async getStatistics(@Request() req: any) {
    const user = await this.getUserFromRequest(req);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view statistics');
    }

    return this.betaService.getStatistics();
  }

  private async getUserFromRequest(req: any) {
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return user;
  }
}

