import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import * as request from 'supertest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  bootstrapTestApp,
  cleanupE2eUsers,
  uniqueEmail,
  uniquePhone,
} from './support/test-app';

interface AuthTokensBody {
  access_token: string;
  refresh_token: string;
}

interface ErrorBody {
  code?: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const password = 'senha123';
  let registeredEmail: string;
  let registeredPhone: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await cleanupE2eUsers(prisma);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('cria um novo usuário e retorna tokens mais o resumo completo do usuário', async () => {
      registeredEmail = uniqueEmail();
      registeredPhone = uniquePhone();

      const response = await request(server)
        .post('/auth/register')
        .send({
          email: registeredEmail,
          phone: registeredPhone,
          password,
          name: 'E2E Register',
        })
        .expect(201);

      const body = response.body as AuthTokensBody & {
        user: { email: string; phone: string; role: string };
      };

      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
      expect(body.user).toMatchObject({
        email: registeredEmail,
        phone: registeredPhone,
        role: 'USER',
      });
    });

    it('rejeita um email duplicado com 409', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          email: registeredEmail,
          phone: uniquePhone(),
          password,
          name: 'Dup Email',
        })
        .expect(409);

      expect((response.body as ErrorBody).code).toBe(
        'USER_EMAIL_ALREADY_EXISTS',
      );
    });

    it('rejeita um telefone duplicado com 409', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          email: uniqueEmail(),
          phone: registeredPhone,
          password,
          name: 'Dup Phone',
        })
        .expect(409);

      expect((response.body as ErrorBody).code).toBe(
        'USER_PHONE_ALREADY_EXISTS',
      );
    });

    it('rejeita um payload inválido com 400', async () => {
      await request(server)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          phone: '123',
          password: '123',
          name: '',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('retorna tokens e o resumo do usuário (sem email) para credenciais válidas', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: registeredEmail, password })
        .expect(200);

      const body = response.body as AuthTokensBody & {
        user: { phone: string; name: string; role: string; email?: string };
      };

      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
      expect(body.user).toMatchObject({
        phone: registeredPhone,
        name: 'E2E Register',
        role: 'USER',
      });
      // a resposta do login usa AuthUserSummaryDto, que não tem campo email
      expect(body.user.email).toBeUndefined();
    });

    it('rejeita uma senha inválida com 400', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: registeredEmail, password: 'wrong-password' })
        .expect(400);

      expect((response.body as ErrorBody).code).toBe('INVALID_PASSWORD');
    });

    it('rejeita um email inexistente com 404', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: uniqueEmail(), password })
        .expect(404);

      expect((response.body as ErrorBody).code).toBe('USER_NOT_FOUND');
    });
  });

  describe('rotas autenticadas', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: registeredEmail, password });

      const body = response.body as AuthTokensBody;
      accessToken = body.access_token;
      refreshToken = body.refresh_token;
    });

    it('GET /auth/profile rejeita uma request sem token', async () => {
      await request(server).get('/auth/profile').expect(401);
    });

    it('GET /auth/profile retorna o perfil com um token válido', async () => {
      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as {
        phone: string;
        name: string;
        role: string;
        isActive: boolean;
        email?: string;
      };

      expect(body).toMatchObject({
        phone: registeredPhone,
        name: 'E2E Register',
        role: 'USER',
        isActive: true,
      });
      // o select do Prisma em getProfile não inclui email — checar a
      // ausência pega um alargamento acidental desse select.
      expect(body.email).toBeUndefined();
    });

    it('POST /auth/refresh rotaciona o refresh token quando válido', async () => {
      const response = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const body = response.body as AuthTokensBody;
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');

      // o refresh token antigo já foi rotacionado
      refreshToken = body.refresh_token;
    });

    it('POST /auth/refresh rejeita um token inválido com 401', async () => {
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-valid-token' })
        .expect(401);
    });

    it('POST /auth/logout rejeita uma request sem token', async () => {
      await request(server).post('/auth/logout').expect(401);
    });

    it('POST /auth/logout invalida o refresh token atual', async () => {
      await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
