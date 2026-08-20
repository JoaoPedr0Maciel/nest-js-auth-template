import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    twoFactorLoginChallenge: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

  const storedUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    password: 'hashed-password',
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      twoFactorLoginChallenge: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn(), verify: jest.fn() };
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, string> = {
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key] ?? fallback;
      }),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

    jwtService.sign.mockReturnValue('signed-token');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('login', () => {
    it('retorna tokens e o resumo do usuário com credenciais válidas', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      const result = await service.login({
        email: storedUser.email,
        password: 'plain-password',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'plain-password',
        storedUser.password,
      );
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
        user: {
          id: storedUser.id,
          phone: storedUser.phone,
          name: storedUser.name,
          role: storedUser.role,
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: storedUser.id },
        data: {
          refreshTokenId: expect.any(String) as string,
          refreshTokenExpiresAt: expect.any(Date) as Date,
        },
      });
    });

    it('lança erro quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@example.com', password: 'x' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('lança erro quando a senha é inválida', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: storedUser.email, password: 'wrong' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('retorna um desafio de 2FA em vez de tokens quando o usuário tem 2FA ativado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...storedUser,
        twoFactorEnabled: true,
      });

      const result = await service.login({
        email: storedUser.email,
        password: 'plain-password',
      });

      expect(result).toMatchObject({ twoFactorRequired: true });
      expect((result as { challengeToken: string }).challengeToken).toEqual(
        expect.any(String),
      );
      expect(prisma.twoFactorLoginChallenge.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String) as string,
          userId: storedUser.id,
          expiresAt: expect.any(Date) as Date,
        },
      });
    });
  });

  describe('createTwoFactorChallenge / resolveTwoFactorChallenge', () => {
    it('grava o challenge no banco e resolve de volta com o mesmo challengeToken', async () => {
      const { challengeToken } = await service.createTwoFactorChallenge(
        storedUser.id,
      );
      prisma.twoFactorLoginChallenge.findUnique.mockResolvedValue({
        id: challengeToken,
        userId: storedUser.id,
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const resolved = await service.resolveTwoFactorChallenge(challengeToken);

      expect(resolved).toBe(storedUser.id);
    });

    it('rejeita quando o challengeToken não existe', async () => {
      prisma.twoFactorLoginChallenge.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveTwoFactorChallenge('unknown-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita e limpa a linha quando o challengeToken expirou', async () => {
      prisma.twoFactorLoginChallenge.findUnique.mockResolvedValue({
        id: 'expired-token',
        userId: storedUser.id,
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resolveTwoFactorChallenge('expired-token'),
      ).rejects.toMatchObject({ status: 401 });
      expect(prisma.twoFactorLoginChallenge.deleteMany).toHaveBeenCalledWith({
        where: { id: 'expired-token' },
      });
    });
  });

  describe('registerTwoFactorChallengeFailure', () => {
    it('não lança enquanto o número de tentativas está abaixo do limite', async () => {
      prisma.twoFactorLoginChallenge.update.mockResolvedValue({
        attempts: 1,
      });

      await expect(
        service.registerTwoFactorChallengeFailure('token-1'),
      ).resolves.toBeUndefined();
      expect(prisma.twoFactorLoginChallenge.deleteMany).not.toHaveBeenCalled();
    });

    it('invalida o desafio e lança erro ao atingir o limite de tentativas', async () => {
      prisma.twoFactorLoginChallenge.update.mockResolvedValue({
        attempts: 5,
      });

      await expect(
        service.registerTwoFactorChallengeFailure('token-1'),
      ).rejects.toMatchObject({ status: 401 });
      expect(prisma.twoFactorLoginChallenge.deleteMany).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      phone: '+5511988888888',
      password: 'plain-password',
      name: 'Novo Usuário',
    };

    it('cria o usuário e retorna tokens quando email/telefone estão livres', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-2',
        email: registerDto.email,
        phone: registerDto.phone,
        name: registerDto.name,
        role: Role.USER,
        createdAt: new Date('2024-01-01'),
      });

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: registerDto.email,
            phone: registerDto.phone,
            name: registerDto.name,
            role: Role.USER,
            password: 'hashed-password',
          },
        }),
      );
      expect(result.access_token).toBe('signed-token');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('lança conflito quando o email já está em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve('email' in where ? storedUser : null),
      );

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('lança conflito quando o telefone já está em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve('phone' in where ? storedUser : null),
      );

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('refresh', () => {
    const activeSession = {
      ...storedUser,
      refreshTokenId: 'abc',
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    };

    it('rotaciona o refresh token quando ele bate com o armazenado no banco', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      prisma.user.findUnique.mockResolvedValue(activeSession);

      const result = await service.refresh('valid-refresh-token');

      expect(result.access_token).toBe('signed-token');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('rejeita quando o token falha na verificação', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.refresh('bad-token')).rejects.toMatchObject({
        status: 401,
      });
    });

    it('rejeita quando o token id armazenado não bate com o payload', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      prisma.user.findUnique.mockResolvedValue({
        ...activeSession,
        refreshTokenId: 'different-token-id',
      });

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita quando o token id armazenado não existe (ex: após logout)', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      prisma.user.findUnique.mockResolvedValue({
        ...activeSession,
        refreshTokenId: null,
        refreshTokenExpiresAt: null,
      });

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita quando o refresh token armazenado expirou', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      prisma.user.findUnique.mockResolvedValue({
        ...activeSession,
        refreshTokenExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita quando o usuário está inativo', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      prisma.user.findUnique.mockResolvedValue({
        ...activeSession,
        isActive: false,
      });

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('logout', () => {
    it('zera o refresh token armazenado do usuário', async () => {
      await service.logout(storedUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: storedUser.id },
        data: { refreshTokenId: null, refreshTokenExpiresAt: null },
      });
    });
  });

  describe('getProfile', () => {
    it('retorna os campos do perfil do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      const result = await service.getProfile(storedUser.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: storedUser.id } }),
      );
      expect(result).toEqual(storedUser);
    });
  });
});
