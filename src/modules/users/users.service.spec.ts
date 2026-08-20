import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const dbUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new UsersService(prisma as unknown as PrismaService);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('findAll', () => {
    it('pagina e aplica os filtros de email/telefone', async () => {
      prisma.user.findMany.mockResolvedValue([dbUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: '1',
        limit: '15',
        email: 'joao',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'joao', mode: 'insensitive' } },
          skip: 0,
          take: 15,
        }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { email: { contains: 'joao', mode: 'insensitive' } },
      });
      expect(result).toEqual({
        data: [dbUser],
        meta: {
          total: 1,
          page: 1,
          limit: 15,
          pages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('findOne', () => {
    it('busca o usuário no banco', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await service.findOne(dbUser.id);

      expect(result).toEqual(dbUser);
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const input = {
      email: 'new@example.com',
      phone: '+5511988888888',
      password: 'plain-password',
      name: 'Novo Usuário',
    };

    it('cria o usuário com telefone normalizado e senha com hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...dbUser, ...input });

      await service.create(input);

      expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: input.email,
            phone: input.phone,
            name: input.name,
            password: 'hashed-password',
            role: Role.USER,
          },
        }),
      );
    });

    it('lança conflito quando o email já está em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve('email' in where ? dbUser : null),
      );

      await expect(service.create(input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('lança conflito quando o telefone já está em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve('phone' in where ? dbUser : null),
      );

      await expect(service.create(input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('atualiza os campos', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      prisma.user.update.mockResolvedValue({ ...dbUser, name: 'Novo Nome' });

      const result = await service.update(dbUser.id, { name: 'Novo Nome' });

      expect(result.name).toBe('Novo Nome');
    });

    it('lança conflito ao trocar para um telefone já em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(
          where && 'id' in where ? dbUser : { ...dbUser, id: 'other-user' },
        ),
      );

      await expect(
        service.update(dbUser.id, { phone: '+5511977777777' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lança conflito ao trocar para um email já em uso', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(
          where && 'id' in where ? dbUser : { ...dbUser, id: 'other-user' },
        ),
      );

      await expect(
        service.update(dbUser.id, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propaga NotFoundException quando o usuário a atualizar não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('faz hash e persiste a nova senha', async () => {
      prisma.user.update.mockResolvedValue(dbUser);

      await service.updatePassword(dbUser.id, 'new-password');

      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: dbUser.id },
          data: { password: 'hashed-password' },
        }),
      );
    });
  });

  describe('remove', () => {
    it('remove o usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      prisma.user.delete.mockResolvedValue(dbUser);

      await service.remove(dbUser.id);

      expect(prisma.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: dbUser.id } }),
      );
    });

    it('lança NotFoundException em vez de remover quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('define isActive como false', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      prisma.user.update.mockResolvedValue({ ...dbUser, isActive: false });

      const result = await service.deactivate(dbUser.id);

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
