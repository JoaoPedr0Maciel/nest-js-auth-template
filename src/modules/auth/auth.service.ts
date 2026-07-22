import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { Errors as userErrors } from '../users/errors';
import { Errors as authErrors } from './errors';
import type {
  JwtPayload,
  RefreshTokenPayload,
} from 'src/common/interfaces/jwt-payload.interface';
import { normalizePhone } from 'src/common/utils/phone.util';
import { durationToSeconds } from 'src/common/utils/duration.util';
import type { TokenSubject } from './interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) throw userErrors.notFound();

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) throw userErrors.invalidPassword();

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const phone = normalizePhone(registerDto.phone);

    const [existingEmail, existingPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: registerDto.email } }),
      this.prisma.user.findUnique({ where: { phone } }),
    ]);

    if (existingEmail) {
      throw userErrors.emailAlreadyExists();
    }

    if (existingPhone) {
      throw userErrors.phoneAlreadyExists();
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        role: Role.USER,
        phone,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw authErrors.invalidRefreshToken();
    }

    const storedTokenId = await this.redis.get(
      this.refreshTokenKey(payload.id),
    );

    if (!storedTokenId || storedTokenId !== payload.tokenId) {
      throw authErrors.invalidRefreshToken();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.isActive) {
      throw authErrors.invalidRefreshToken();
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(this.refreshTokenKey(userId));
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async issueTokens(
    user: TokenSubject,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const tokenId = randomUUID();
    const refreshPayload: RefreshTokenPayload = { id: user.id, tokenId };

    const refresh_token = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    await this.redis.set(
      this.refreshTokenKey(user.id),
      tokenId,
      durationToSeconds(refreshExpiresIn),
    );

    return { access_token, refresh_token };
  }

  private refreshTokenKey(userId: string): string {
    return `refresh-token:${userId}`;
  }
}
