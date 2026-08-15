import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Server } from 'http';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  bootstrapTestApp,
  cleanupE2eUsers,
  createUserDirectly,
  uniqueEmail,
  uniquePhone,
} from './support/test-app';

interface UserBody {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
  isActive?: boolean;
}

interface PaginatedUsersBody {
  data: UserBody[];
  meta: { page: number; limit: number; total: number };
}

interface ErrorBody {
  code?: string;
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  let adminToken: string;
  let userToken: string;
  let plainUserId: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    server = app.getHttpServer() as Server;

    const admin = await createUserDirectly(prisma, { role: Role.ADMIN });
    const plainUser = await createUserDirectly(prisma, { role: Role.USER });
    plainUserId = plainUser.user.id;

    const [adminLogin, userLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: admin.user.email, password: admin.password }),
      request(server)
        .post('/auth/login')
        .send({ email: plainUser.user.email, password: plainUser.password }),
    ]);

    adminToken = (adminLogin.body as { access_token: string }).access_token;
    userToken = (userLogin.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await cleanupE2eUsers(prisma);
    await app.close();
  });

  describe('GET /users', () => {
    it('rejeita uma request sem token', async () => {
      await request(server).get('/users').expect(401);
    });

    it('rejeita um usuário não-ADMIN com 403', async () => {
      await request(server)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('retorna uma lista paginada para um ADMIN', async () => {
      const response = await request(server)
        .get('/users')
        .query({ page: 1, limit: 15 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PaginatedUsersBody;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toMatchObject({ page: 1, limit: 15 });
    });
  });

  describe('GET /users/:id', () => {
    it('retorna o usuário para um ADMIN', async () => {
      const response = await request(server)
        .get(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as UserBody).id).toBe(plainUserId);
    });

    it('retorna 404 para um id inexistente', async () => {
      const response = await request(server)
        .get(`/users/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect((response.body as ErrorBody).code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /users', () => {
    it('cria um usuário como ADMIN', async () => {
      const email = uniqueEmail();
      const phone = uniquePhone();

      const response = await request(server)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          phone,
          password: 'senha123',
          name: 'Created By Admin',
        })
        .expect(201);

      expect(response.body as UserBody).toMatchObject({
        email,
        phone,
        role: 'USER',
      });
    });

    it('rejeita um não-ADMIN com 403', async () => {
      await request(server)
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: uniqueEmail(),
          phone: uniquePhone(),
          password: 'senha123',
          name: 'Nope',
        })
        .expect(403);
    });

    it('rejeita um email duplicado com 409', async () => {
      const existing = await request(server)
        .get(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const existingEmail = (existing.body as UserBody).email;

      const response = await request(server)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: existingEmail,
          phone: uniquePhone(),
          password: 'senha123',
          name: 'Dup Email',
        })
        .expect(409);

      expect((response.body as ErrorBody).code).toBe(
        'USER_EMAIL_ALREADY_EXISTS',
      );
    });
  });

  describe('PATCH /users/:id', () => {
    it('atualiza o usuário como ADMIN', async () => {
      const response = await request(server)
        .patch(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nome Atualizado' })
        .expect(200);

      expect((response.body as UserBody).name).toBe('Nome Atualizado');
    });
  });

  describe('PATCH /users/:id/password', () => {
    it('permite que um ADMIN troque a senha de outro usuário', async () => {
      await request(server)
        .patch(`/users/${plainUserId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'nova-senha-123' })
        .expect(200);
    });
  });

  describe('PATCH /users/me/password', () => {
    it('permite que qualquer usuário autenticado troque a própria senha', async () => {
      await request(server)
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'outra-senha-123' })
        .expect(200);
    });

    it('rejeita uma request sem token', async () => {
      await request(server)
        .patch('/users/me/password')
        .send({ password: 'outra-senha-123' })
        .expect(401);
    });
  });

  describe('PATCH /users/:id/deactivate', () => {
    it('desativa o usuário como ADMIN', async () => {
      const response = await request(server)
        .patch(`/users/${plainUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as UserBody).isActive).toBe(false);
    });
  });

  describe('DELETE /users/:id', () => {
    it('remove o usuário como ADMIN, invalidando o cache', async () => {
      // aquece o cache antes de deletar, pra exercitar a invalidação
      await request(server)
        .get(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(server)
        .delete(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(server)
        .get(`/users/${plainUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
