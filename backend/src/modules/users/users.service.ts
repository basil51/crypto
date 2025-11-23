import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(): Promise<UserWithoutPassword[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users as UserWithoutPassword[];
  }

  async findOne(id: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user as UserWithoutPassword | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}

