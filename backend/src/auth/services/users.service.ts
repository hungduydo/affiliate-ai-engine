import { Injectable, BadRequestException } from '@nestjs/common';
import { FlowAccountsPrisma } from '@shared/database/flow-accounts.prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private flowAccountsPrisma: FlowAccountsPrisma) {}

  async findById(id: string) {
    const user = await this.flowAccountsPrisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.flowAccountsPrisma.client.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async validatePassword(email: string, password: string) {
    const user = await this.flowAccountsPrisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async getRefreshToken(token: string) {
    const refreshToken =
      await this.flowAccountsPrisma.client.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

    if (!refreshToken || refreshToken.revokedAt) {
      throw new BadRequestException('Invalid refresh token');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new BadRequestException('Refresh token expired');
    }

    return refreshToken;
  }

  async revokeRefreshToken(tokenId: string) {
    await this.flowAccountsPrisma.client.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return this.flowAccountsPrisma.client.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
}
