import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { v4 as uuidv4 } from 'uuid';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.usersService.validatePassword(email, password);

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const tokenRecord = await this.usersService.getRefreshToken(
        refreshToken,
      );

      const user = await this.usersService.findById(decoded.id);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      await this.usersService.revokeRefreshToken(tokenRecord.id);

      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
    );
    const jwtExpiry = parseInt(
      this.configService.get<string>('JWT_EXPIRY') || '900',
    );
    const jwtRefreshExpiry = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '604800',
    );

    const payload = { id: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: jwtExpiry,
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: jwtRefreshExpiry,
    });

    await this.usersService.createRefreshToken(
      userId,
      refreshTokenValue,
      new Date(Date.now() + jwtRefreshExpiry * 1000),
    );

    return { accessToken, refreshTokenValue };
  }
}
