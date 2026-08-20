import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwoFactorAuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { secondsFromNow } from '../../shared/utils/duration.util';
import { AuthService } from '../auth/auth.service';
import { Errors as userErrors } from '../users/errors';
import { Errors as twoFactorErrors } from './errors';
import { ConfirmTwoFactorSetupDto } from './dto/confirm-two-factor-setup.dto';
import { TwoFactorConfirmIdentityDto } from './dto/two-factor-confirm-identity.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { VerifyTwoFactorRecoveryDto } from './dto/verify-two-factor-recovery.dto';
import {
  buildTotpAuthUrl,
  generateTotpSecret,
  verifyTotpCode,
} from './utils/totp.util';
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from './utils/two-factor-crypto.util';
import { generateRecoveryCodes } from './utils/recovery-code.util';

const PENDING_SETUP_TTL_SECONDS = 600;
const RECOVERY_CODE_BCRYPT_ROUNDS = 10;

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  async setup(userId: string) {
    const user = await this.getUserOrThrow(userId);
    if (user.twoFactorEnabled) throw twoFactorErrors.alreadyEnabled();

    const secret = generateTotpSecret();
    const issuer = this.configService.get<string>(
      'TWO_FACTOR_ISSUER',
      'NestJS Auth Template',
    );
    const otpauthUrl = buildTotpAuthUrl({
      issuer,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorPendingSecret: encryptTwoFactorSecret(
          secret,
          this.encryptionKey(),
        ),
        twoFactorPendingSecretExpiresAt: secondsFromNow(
          PENDING_SETUP_TTL_SECONDS,
        ),
      },
    });

    return { manualEntryKey: secret, otpauthUrl, qrCodeDataUrl };
  }

  async confirmSetup(userId: string, dto: ConfirmTwoFactorSetupDto) {
    const user = await this.getUserOrThrow(userId);
    if (user.twoFactorEnabled) throw twoFactorErrors.alreadyEnabled();

    if (
      !user.twoFactorPendingSecret ||
      !user.twoFactorPendingSecretExpiresAt ||
      user.twoFactorPendingSecretExpiresAt < new Date()
    ) {
      throw twoFactorErrors.setupNotFound();
    }

    const pendingSecret = decryptTwoFactorSecret(
      user.twoFactorPendingSecret,
      this.encryptionKey(),
    );

    const isValid = verifyTotpCode(dto.code, pendingSecret);
    if (!isValid) throw twoFactorErrors.invalidCode();

    const encryptedSecret = encryptTwoFactorSecret(
      pendingSecret,
      this.encryptionKey(),
    );
    const recoveryCodes = generateRecoveryCodes();
    const hashedRecoveryCodes = await this.hashRecoveryCodes(
      userId,
      recoveryCodes,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptedSecret,
          twoFactorPendingSecret: null,
          twoFactorPendingSecretExpiresAt: null,
        },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({
        data: hashedRecoveryCodes,
      }),
      this.prisma.twoFactorAuditLog.create({
        data: { userId, action: TwoFactorAuditAction.ENABLED },
      }),
    ]);

    return { recoveryCodes };
  }

  async disable(userId: string, dto: TwoFactorConfirmIdentityDto) {
    const user = await this.getUserOrThrow(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw twoFactorErrors.notEnabled();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw userErrors.invalidPassword();

    await this.verifySecondFactor(user.id, user.twoFactorSecret, dto.code);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorAuditLog.create({
        data: { userId, action: TwoFactorAuditAction.DISABLED },
      }),
    ]);

    await this.authService.logout(userId);
  }

  async regenerateRecoveryCodes(
    userId: string,
    dto: TwoFactorConfirmIdentityDto,
  ) {
    const user = await this.getUserOrThrow(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw twoFactorErrors.notEnabled();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw userErrors.invalidPassword();

    await this.verifySecondFactor(user.id, user.twoFactorSecret, dto.code);

    const recoveryCodes = generateRecoveryCodes();
    const hashedRecoveryCodes = await this.hashRecoveryCodes(
      userId,
      recoveryCodes,
    );

    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({
        data: hashedRecoveryCodes,
      }),
      this.prisma.twoFactorAuditLog.create({
        data: {
          userId,
          action: TwoFactorAuditAction.RECOVERY_CODES_REGENERATED,
        },
      }),
    ]);

    return { recoveryCodes };
  }

  async verifyChallenge(dto: VerifyTwoFactorDto) {
    const userId = await this.authService.resolveTwoFactorChallenge(
      dto.challengeToken,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw twoFactorErrors.notEnabled();
    }

    const secret = decryptTwoFactorSecret(
      user.twoFactorSecret,
      this.encryptionKey(),
    );
    const isValid = verifyTotpCode(dto.code, secret);

    if (!isValid) {
      await this.authService.registerTwoFactorChallengeFailure(
        dto.challengeToken,
      );
      throw twoFactorErrors.invalidCode();
    }

    await this.authService.consumeTwoFactorChallenge(dto.challengeToken);
    return this.authService.buildLoginResponse(user);
  }

  async verifyRecoveryChallenge(dto: VerifyTwoFactorRecoveryDto) {
    const userId = await this.authService.resolveTwoFactorChallenge(
      dto.challengeToken,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorEnabled) {
      throw twoFactorErrors.notEnabled();
    }

    const recoveryCode = await this.findMatchingRecoveryCode(
      user.id,
      dto.recoveryCode,
    );

    if (!recoveryCode) {
      await this.authService.registerTwoFactorChallengeFailure(
        dto.challengeToken,
      );
      throw twoFactorErrors.invalidRecoveryCode();
    }

    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.update({
        where: { id: recoveryCode.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.twoFactorAuditLog.create({
        data: {
          userId: user.id,
          action: TwoFactorAuditAction.RECOVERY_CODE_USED,
        },
      }),
    ]);

    await this.authService.consumeTwoFactorChallenge(dto.challengeToken);
    return this.authService.buildLoginResponse(user);
  }

  /** Aceita tanto um código TOTP quanto um código de recuperação (consumindo-o) como segundo fator. */
  private async verifySecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<void> {
    const secret = decryptTwoFactorSecret(
      encryptedSecret,
      this.encryptionKey(),
    );
    const isTotpValid = verifyTotpCode(code, secret);
    if (isTotpValid) return;

    const recoveryCode = await this.findMatchingRecoveryCode(userId, code);
    if (!recoveryCode) throw twoFactorErrors.invalidCode();

    await this.prisma.twoFactorRecoveryCode.update({
      where: { id: recoveryCode.id },
      data: { usedAt: new Date() },
    });
  }

  private async findMatchingRecoveryCode(userId: string, plainCode: string) {
    const candidates = await this.prisma.twoFactorRecoveryCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const candidate of candidates) {
      const matches = await bcrypt.compare(plainCode, candidate.codeHash);
      if (matches) return candidate;
    }

    return null;
  }

  private async hashRecoveryCodes(userId: string, codes: string[]) {
    return Promise.all(
      codes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, RECOVERY_CODE_BCRYPT_ROUNDS),
      })),
    );
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw userErrors.notFound();
    return user;
  }

  private encryptionKey(): string {
    return this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
  }
}
