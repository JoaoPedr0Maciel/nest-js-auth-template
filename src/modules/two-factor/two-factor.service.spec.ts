import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
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

jest.mock('bcrypt');
jest.mock('qrcode');
// Automock do jest não reproduz o shape desses módulos locais sob o
// transform do @swc/jest — mock explícito evita exports undefined.
jest.mock('./utils/totp.util', () => ({
  generateTotpSecret: jest.fn(),
  buildTotpAuthUrl: jest.fn(),
  generateTotpCode: jest.fn(),
  verifyTotpCode: jest.fn(),
}));
jest.mock('./utils/two-factor-crypto.util', () => ({
  encryptTwoFactorSecret: jest.fn(),
  decryptTwoFactorSecret: jest.fn(),
}));
jest.mock('./utils/recovery-code.util', () => ({
  generateRecoveryCodes: jest.fn(),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    twoFactorRecoveryCode: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    twoFactorAuditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let authService: {
    resolveTwoFactorChallenge: jest.Mock;
    registerTwoFactorChallengeFailure: jest.Mock;
    consumeTwoFactorChallenge: jest.Mock;
    buildLoginResponse: jest.Mock;
    logout: jest.Mock;
  };

  const encryptionKey = 'x'.repeat(32);

  const baseUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: 'USER',
    password: 'hashed-password',
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null as string | null,
    twoFactorPendingSecret: null as string | null,
    twoFactorPendingSecretExpiresAt: null as Date | null,
  };

  const pendingUser = {
    ...baseUser,
    twoFactorPendingSecret: 'encrypted-pending-secret',
    twoFactorPendingSecretExpiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      twoFactorRecoveryCode: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      twoFactorAuditLog: { create: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, string> = {
          TWO_FACTOR_ISSUER: 'Test Issuer',
          TWO_FACTOR_ENCRYPTION_KEY: encryptionKey,
        };
        return values[key] ?? fallback;
      }),
    };
    authService = {
      resolveTwoFactorChallenge: jest.fn(),
      registerTwoFactorChallengeFailure: jest.fn(),
      consumeTwoFactorChallenge: jest.fn(),
      buildLoginResponse: jest.fn().mockResolvedValue('login-response'),
      logout: jest.fn(),
    };

    service = new TwoFactorService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      authService as unknown as AuthService,
    );

    (generateTotpSecret as jest.Mock).mockReturnValue('PENDING_SECRET');
    (buildTotpAuthUrl as jest.Mock).mockReturnValue('otpauth://totp/test');
    (verifyTotpCode as jest.Mock).mockReturnValue(true);
    (encryptTwoFactorSecret as jest.Mock).mockReturnValue('encrypted-secret');
    (decryptTwoFactorSecret as jest.Mock).mockReturnValue('PENDING_SECRET');
    (generateRecoveryCodes as jest.Mock).mockReturnValue([
      'AAAA-AAAA',
      'BBBB-BBBB',
    ]);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,x',
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
  });

  describe('setup', () => {
    it('gera segredo pendente, QR code e guarda cifrado no usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.setup(baseUser.id);

      expect(result).toEqual({
        manualEntryKey: 'PENDING_SECRET',
        otpauthUrl: 'otpauth://totp/test',
        qrCodeDataUrl: 'data:image/png;base64,x',
      });
      expect(encryptTwoFactorSecret).toHaveBeenCalledWith(
        'PENDING_SECRET',
        encryptionKey,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: {
          twoFactorPendingSecret: 'encrypted-secret',
          twoFactorPendingSecretExpiresAt: expect.any(Date) as Date,
        },
      });
    });

    it('rejeita quando o 2FA já está ativado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
      });

      await expect(service.setup(baseUser.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('confirmSetup', () => {
    it('ativa o 2FA, limpa o pendente e retorna os códigos de recuperação com um código válido', async () => {
      prisma.user.findUnique.mockResolvedValue(pendingUser);

      const result = await service.confirmSetup(baseUser.id, {
        code: '123456',
      });

      expect(decryptTwoFactorSecret).toHaveBeenCalledWith(
        'encrypted-pending-secret',
        encryptionKey,
      );
      expect(result).toEqual({ recoveryCodes: ['AAAA-AAAA', 'BBBB-BBBB'] });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            twoFactorEnabled: true,
            twoFactorSecret: 'encrypted-secret',
            twoFactorPendingSecret: null,
            twoFactorPendingSecretExpiresAt: null,
          },
        }),
      );
    });

    it('rejeita quando não há configuração pendente', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.confirmSetup(baseUser.id, { code: '123456' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejeita quando a configuração pendente expirou', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...pendingUser,
        twoFactorPendingSecretExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.confirmSetup(baseUser.id, { code: '123456' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejeita um código inválido e não ativa o 2FA', async () => {
      prisma.user.findUnique.mockResolvedValue(pendingUser);
      (verifyTotpCode as jest.Mock).mockReturnValue(false);

      await expect(
        service.confirmSetup(baseUser.id, { code: '000000' }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    const enabledUser = {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'encrypted-secret',
    };

    it('desativa o 2FA com senha e código válidos, e invalida sessões', async () => {
      prisma.user.findUnique.mockResolvedValue(enabledUser);

      await service.disable(baseUser.id, {
        password: 'senha123',
        code: '123456',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { twoFactorEnabled: false, twoFactorSecret: null },
        }),
      );
      expect(prisma.twoFactorRecoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id },
      });
      expect(authService.logout).toHaveBeenCalledWith(baseUser.id);
    });

    it('rejeita quando a senha está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(enabledUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.disable(baseUser.id, { password: 'errada', code: '123456' }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejeita quando o 2FA não está ativado', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.disable(baseUser.id, { password: 'senha123', code: '123456' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('aceita um código de recuperação válido como segundo fator', async () => {
      prisma.user.findUnique.mockResolvedValue(enabledUser);
      (verifyTotpCode as jest.Mock).mockReturnValue(false);
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
        { id: 'code-1', codeHash: 'hashed-code', usedAt: null },
      ]);

      await service.disable(baseUser.id, {
        password: 'senha123',
        code: 'AAAA-AAAA',
      });

      expect(prisma.twoFactorRecoveryCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'code-1' } }),
      );
      const [updateCallArgs] = prisma.twoFactorRecoveryCode.update.mock
        .calls[0] as [{ data: { usedAt: Date } }];
      expect(updateCallArgs.data.usedAt).toBeInstanceOf(Date);
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('gera novos códigos e invalida os anteriores', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
      });

      const result = await service.regenerateRecoveryCodes(baseUser.id, {
        password: 'senha123',
        code: '123456',
      });

      expect(result).toEqual({ recoveryCodes: ['AAAA-AAAA', 'BBBB-BBBB'] });
      expect(prisma.twoFactorRecoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id },
      });
      expect(prisma.twoFactorRecoveryCode.createMany).toHaveBeenCalled();
    });
  });

  describe('verifyChallenge', () => {
    it('completa o login quando o código é válido', async () => {
      authService.resolveTwoFactorChallenge.mockResolvedValue(baseUser.id);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
      });

      const result = await service.verifyChallenge({
        challengeToken: 'token-1',
        code: '123456',
      });

      expect(result).toBe('login-response');
      expect(authService.consumeTwoFactorChallenge).toHaveBeenCalledWith(
        'token-1',
      );
    });

    it('registra a falha e rejeita quando o código é inválido', async () => {
      authService.resolveTwoFactorChallenge.mockResolvedValue(baseUser.id);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
      });
      (verifyTotpCode as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyChallenge({ challengeToken: 'token-1', code: '000000' }),
      ).rejects.toMatchObject({ status: 400 });
      expect(
        authService.registerTwoFactorChallengeFailure,
      ).toHaveBeenCalledWith('token-1');
      expect(authService.consumeTwoFactorChallenge).not.toHaveBeenCalled();
    });
  });

  describe('verifyRecoveryChallenge', () => {
    it('completa o login com um código de recuperação válido, sem desativar o 2FA', async () => {
      authService.resolveTwoFactorChallenge.mockResolvedValue(baseUser.id);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
      });
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
        { id: 'code-1', codeHash: 'hashed-code', usedAt: null },
      ]);

      const result = await service.verifyRecoveryChallenge({
        challengeToken: 'token-1',
        recoveryCode: 'AAAA-AAAA',
      });

      expect(result).toBe('login-response');
      expect(prisma.twoFactorRecoveryCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'code-1' } }),
      );
      const [updateCallArgs] = prisma.twoFactorRecoveryCode.update.mock
        .calls[0] as [{ data: { usedAt: Date } }];
      expect(updateCallArgs.data.usedAt).toBeInstanceOf(Date);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejeita um código de recuperação já utilizado (não retorna nos candidatos)', async () => {
      authService.resolveTwoFactorChallenge.mockResolvedValue(baseUser.id);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
      });
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([]);

      await expect(
        service.verifyRecoveryChallenge({
          challengeToken: 'token-1',
          recoveryCode: 'AAAA-AAAA',
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(
        authService.registerTwoFactorChallengeFailure,
      ).toHaveBeenCalledWith('token-1');
    });
  });
});
