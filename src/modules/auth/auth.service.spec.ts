import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const storedUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
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
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      redis as unknown as RedisService,
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
      expect(redis.set).toHaveBeenCalledWith(
        `refresh-token:${storedUser.id}`,
        expect.any(String),
        604800,
      );
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
    it('rotaciona o refresh token quando ele bate com o armazenado no Redis', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      redis.get.mockResolvedValue('abc');
      prisma.user.findUnique.mockResolvedValue(storedUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result.access_token).toBe('signed-token');
      expect(redis.set).toHaveBeenCalled();
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
      redis.get.mockResolvedValue('different-token-id');

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita quando o token id armazenado não existe (ex: após logout)', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      redis.get.mockResolvedValue(null);

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejeita quando o usuário está inativo', async () => {
      jwtService.verify.mockReturnValue({ id: storedUser.id, tokenId: 'abc' });
      redis.get.mockResolvedValue('abc');
      prisma.user.findUnique.mockResolvedValue({
        ...storedUser,
        isActive: false,
      });

      await expect(
        service.refresh('valid-refresh-token'),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('logout', () => {
    it('remove o refresh token armazenado do usuário', async () => {
      await service.logout(storedUser.id);

      expect(redis.del).toHaveBeenCalledWith(`refresh-token:${storedUser.id}`);
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
