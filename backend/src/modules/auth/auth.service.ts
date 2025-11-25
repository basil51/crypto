import { Injectable, UnauthorizedException, Inject, forwardRef, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { BetaService } from '../beta/beta.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Optional() @Inject(forwardRef(() => BetaService))
    private betaService?: BetaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndsAt: user.subscriptionEndsAt,
      },
    };
  }

  async validateUserForJwt(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }

  async register(email: string, password: string, invitationCode?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      passwordHash: hashedPassword,
    });

    // If invitation code provided, accept it
    if (invitationCode && this.betaService) {
      try {
        await this.betaService.acceptInvitation(invitationCode, user.id);
      } catch (error) {
        // Log error but don't fail registration
        console.error('Failed to accept invitation:', error);
      }
    }

    return this.login(user);
  }
}

