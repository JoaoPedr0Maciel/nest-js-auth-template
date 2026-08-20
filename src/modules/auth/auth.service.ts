import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Errors as userErrors } from '../users/errors';
import { Errors as authErrors } from './errors';
import type {
  JwtPayload,
  RefreshTokenPayload,
} from 'src/shared/interfaces/jwt-payload.interface';
import { normalizePhone } from '../../shared/utils/phone.util';
import {
  durationToSeconds,
  secondsFromNow,
} from '../../shared/utils/duration.util';
import type { TokenSubject } from './interfaces/user.interface';
import type { TwoFactorChallengeResponseDto } from './dto/two-factor-challenge-response.dto';

const TWO_FACTOR_CHALLENGE_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

    if (user.twoFactorEnabled) {
      return this.createTwoFactorChallenge(user.id);
    }

    return this.buildLoginResponse(user);
  }

  async buildLoginResponse(user: TokenSubject) {
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

  /** Emitido após a senha ser validada — o login só se completa em TwoFactorService.verifyChallenge/verifyRecoveryChallenge. */
  async createTwoFactorChallenge(
    userId: string,
  ): Promise<TwoFactorChallengeResponseDto> {
    const challengeToken = randomUUID();

    await this.prisma.twoFactorLoginChallenge.create({
      data: {
        id: challengeToken,
        userId,
        expiresAt: secondsFromNow(this.twoFactorChallengeTtlSeconds()),
      },
    });

    return { twoFactorRequired: true, challengeToken };
  }

  async resolveTwoFactorChallenge(challengeToken: string): Promise<string> {
    const challenge = await this.prisma.twoFactorLoginChallenge.findUnique({
      where: { id: challengeToken },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await this.consumeTwoFactorChallenge(challengeToken);
      throw authErrors.twoFactorChallengeExpired();
    }

    return challenge.userId;
  }

  async registerTwoFactorChallengeFailure(
    challengeToken: string,
  ): Promise<void> {
    const challenge = await this.prisma.twoFactorLoginChallenge.update({
      where: { id: challengeToken },
      data: { attempts: { increment: 1 } },
    });

    if (challenge.attempts >= TWO_FACTOR_CHALLENGE_MAX_ATTEMPTS) {
      await this.consumeTwoFactorChallenge(challengeToken);
      throw authErrors.twoFactorTooManyAttempts();
    }
  }

  async consumeTwoFactorChallenge(challengeToken: string): Promise<void> {
    await this.prisma.twoFactorLoginChallenge.deleteMany({
      where: { id: challengeToken },
    });
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (
      !user ||
      !user.isActive ||
      user.refreshTokenId !== payload.tokenId ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt < new Date()
    ) {
      throw authErrors.invalidRefreshToken();
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenId: null, refreshTokenExpiresAt: null },
    });
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenId: tokenId,
        refreshTokenExpiresAt: secondsFromNow(
          durationToSeconds(refreshExpiresIn),
        ),
      },
    });

    return { access_token, refresh_token };
  }

  private twoFactorChallengeTtlSeconds(): number {
    return this.configService.get<number>(
      'TWO_FACTOR_CHALLENGE_TTL_SECONDS',
      300,
    );
  }
}
