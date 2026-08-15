import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  const activeUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    isActive: true,
  };

  const buildContext = (authorization?: string): ExecutionContext => {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: authorization ? { authorization } : {},
    };

    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwtService = { verify: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('jwt-secret') };
    prisma = { user: { findUnique: jest.fn() } };

    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('permite acesso sem checar token em rotas públicas', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejeita quando não há header Authorization', async () => {
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      new UnauthorizedException('Token not found'),
    );
  });

  it('rejeita quando o header Authorization não é um Bearer token', async () => {
    await expect(
      guard.canActivate(buildContext('Basic abc123')),
    ).rejects.toThrow(new UnauthorizedException('Token not found'));
  });

  it('rejeita um token inválido/expirado', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(
      guard.canActivate(buildContext('Bearer bad-token')),
    ).rejects.toThrow(new UnauthorizedException('Invalid token'));
  });

  it('rejeita quando o usuário do token não existe mais', async () => {
    jwtService.verify.mockReturnValue({ id: 'user-1' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(buildContext('Bearer good-token')),
    ).rejects.toThrow(new UnauthorizedException('User not found'));
  });

  it('rejeita quando a conta do usuário está inativa', async () => {
    jwtService.verify.mockReturnValue({ id: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(
      guard.canActivate(buildContext('Bearer good-token')),
    ).rejects.toThrow(new UnauthorizedException('User account is inactive'));
  });

  it('anexa o usuário na request e permite acesso com um token válido', async () => {
    jwtService.verify.mockReturnValue({ id: 'user-1' });
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const context = buildContext('Bearer good-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    expect(request.user).toEqual(activeUser);
  });
});
