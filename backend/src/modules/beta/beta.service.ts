import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class BetaService {
  private readonly logger = new Logger(BetaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a beta invitation
   */
  async createInvitation(invitedByUserId: string, email: string): Promise<any> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if invitation already exists for this email
    const existingInvitation = await this.prisma.betaInvitation.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('Active invitation already exists for this email');
    }

    // Generate unique invitation code
    const code = this.generateInvitationCode();

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.betaInvitation.create({
      data: {
        email,
        code,
        invitedById: invitedByUserId,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Beta invitation created: ${invitation.id} for ${email}`);

    return invitation;
  }

  /**
   * Get all invitations
   */
  async getInvitations(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.betaInvitation.findMany({
      where,
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
          },
        },
        invitedUser: {
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
   * Get invitation by code
   */
  async getInvitationByCode(code: string) {
    const invitation = await this.prisma.betaInvitation.findUnique({
      where: { code },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation has already been used or expired');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      // Mark as expired
      await this.prisma.betaInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  /**
   * Accept invitation (called during registration)
   */
  async acceptInvitation(code: string, userId: string): Promise<void> {
    const invitation = await this.getInvitationByCode(code);

    await this.prisma.betaInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        invitedUserId: userId,
        acceptedAt: new Date(),
      },
    });

    this.logger.log(`Beta invitation accepted: ${invitation.id} by user ${userId}`);
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const invitation = await this.prisma.betaInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot revoke an accepted invitation');
    }

    await this.prisma.betaInvitation.update({
      where: { id: invitationId },
      data: { status: 'EXPIRED' },
    });

    this.logger.log(`Beta invitation revoked: ${invitationId}`);
  }

  /**
   * Get beta statistics
   */
  async getStatistics() {
    const [total, pending, accepted, expired] = await Promise.all([
      this.prisma.betaInvitation.count(),
      this.prisma.betaInvitation.count({ where: { status: 'PENDING' } }),
      this.prisma.betaInvitation.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.betaInvitation.count({ where: { status: 'EXPIRED' } }),
    ]);

    return {
      total,
      pending,
      accepted,
      expired,
    };
  }

  /**
   * Generate unique invitation code
   */
  private generateInvitationCode(): string {
    return randomBytes(16).toString('hex').toUpperCase();
  }
}

