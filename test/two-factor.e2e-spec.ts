import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import * as request from 'supertest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { generateTotpCode } from '../src/modules/two-factor/utils/totp.util';
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

interface ChallengeBody {
  twoFactorRequired: true;
  challengeToken: string;
}

interface SetupBody {
  manualEntryKey: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

interface RecoveryCodesBody {
  recoveryCodes: string[];
}

interface ErrorBody {
  code?: string;
}

/**
 * POST /auth/login é limitado a 5 req/min (mesma proteção contra abuso do
 * fluxo de senha). Os testes abaixo reaproveitam um challengeToken entre
 * asserções sempre que a regra de negócio permite (um código inválido não
 * invalida o desafio), pra caber nesse limite num único arquivo e2e.
 */
describe('Two-Factor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const password = 'senha123';
  let email: string;
  let accessToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    server = app.getHttpServer() as Server;

    email = uniqueEmail();
    const registerResponse = await request(server).post('/auth/register').send({
      email,
      phone: uniquePhone(),
      password,
      name: 'E2E 2FA User',
    });

    accessToken = (registerResponse.body as AuthTokensBody).access_token;
  });

  afterAll(async () => {
    await cleanupE2eUsers(prisma);
    await app.close();
  });

  async function login(): Promise<ChallengeBody> {
    const response = await request(server)
      .post('/auth/login')
      .send({ email, password });
    return response.body as ChallengeBody;
  }

  describe('setup e confirmação', () => {
    let manualEntryKey: string;
    let recoveryCodes: string[];

    it('POST /auth/2fa/setup rejeita sem token', async () => {
      await request(server).post('/auth/2fa/setup').expect(401);
    });

    it('POST /auth/2fa/setup retorna segredo e QR code pendentes', async () => {
      const response = await request(server)
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const body = response.body as SetupBody;
      expect(typeof body.manualEntryKey).toBe('string');
      expect(body.otpauthUrl).toContain('otpauth://totp/');
      expect(body.qrCodeDataUrl).toContain('data:image/png;base64,');

      manualEntryKey = body.manualEntryKey;
    });

    it('POST /auth/2fa/setup/confirm rejeita um código inválido', async () => {
      const response = await request(server)
        .post('/auth/2fa/setup/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect((response.body as ErrorBody).code).toBe('TWO_FACTOR_INVALID_CODE');
    });

    it('POST /auth/2fa/setup/confirm ativa o 2FA com um código válido e retorna códigos de recuperação', async () => {
      const code = generateTotpCode(manualEntryKey);

      const response = await request(server)
        .post('/auth/2fa/setup/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(200);

      const body = response.body as RecoveryCodesBody;
      expect(body.recoveryCodes).toHaveLength(10);
      recoveryCodes = body.recoveryCodes;
    });

    describe('login com 2FA ativo', () => {
      it('POST /auth/login retorna um desafio de 2FA; POST /auth/2fa/verify rejeita um código inválido e, na sequência, aceita um código válido para o mesmo desafio', async () => {
        const { twoFactorRequired, challengeToken } = await login();

        expect(twoFactorRequired).toBe(true);
        expect(typeof challengeToken).toBe('string');

        const invalidResponse = await request(server)
          .post('/auth/2fa/verify')
          .send({ challengeToken, code: '000000' })
          .expect(400);
        expect((invalidResponse.body as ErrorBody).code).toBe(
          'TWO_FACTOR_INVALID_CODE',
        );

        const code = generateTotpCode(manualEntryKey);
        const validResponse = await request(server)
          .post('/auth/2fa/verify')
          .send({ challengeToken, code })
          .expect(200);

        const body = validResponse.body as AuthTokensBody;
        expect(typeof body.access_token).toBe('string');
        expect(typeof body.refresh_token).toBe('string');
      });

      it('POST /auth/2fa/verify/recovery completa o login com um código de recuperação, e o mesmo código não pode ser reutilizado', async () => {
        const [recoveryCode] = recoveryCodes;

        const first = await login();
        const successResponse = await request(server)
          .post('/auth/2fa/verify/recovery')
          .send({ challengeToken: first.challengeToken, recoveryCode })
          .expect(200);
        expect(
          typeof (successResponse.body as AuthTokensBody).access_token,
        ).toBe('string');

        // Precisar de um novo desafio aqui já prova que a recuperação não desativou o 2FA.
        const second = await login();
        const reuseResponse = await request(server)
          .post('/auth/2fa/verify/recovery')
          .send({ challengeToken: second.challengeToken, recoveryCode })
          .expect(400);
        expect((reuseResponse.body as ErrorBody).code).toBe(
          'TWO_FACTOR_INVALID_RECOVERY_CODE',
        );
      });
    });

    it('POST /auth/2fa/recovery-codes/regenerate invalida os códigos anteriores', async () => {
      const code = generateTotpCode(manualEntryKey);
      const [, unusedOldCode] = recoveryCodes;

      const response = await request(server)
        .post('/auth/2fa/recovery-codes/regenerate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password, code })
        .expect(200);

      const newCodes = (response.body as RecoveryCodesBody).recoveryCodes;
      expect(newCodes).toHaveLength(10);
      expect(newCodes).not.toEqual(expect.arrayContaining(recoveryCodes));

      const { challengeToken } = await login();
      await request(server)
        .post('/auth/2fa/verify/recovery')
        .send({ challengeToken, recoveryCode: unusedOldCode })
        .expect(400);

      recoveryCodes = newCodes;
    });

    describe('desativação', () => {
      it('POST /auth/2fa/disable rejeita senha incorreta', async () => {
        const code = generateTotpCode(manualEntryKey);

        await request(server)
          .post('/auth/2fa/disable')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ password: 'senha-errada', code })
          .expect(400);
      });

      it('POST /auth/2fa/disable desativa o 2FA com senha e código válidos, e o login deixa de exigir o segundo fator', async () => {
        const code = generateTotpCode(manualEntryKey);

        await request(server)
          .post('/auth/2fa/disable')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ password, code })
          .expect(204);

        const loginResponse = await request(server)
          .post('/auth/login')
          .send({ email, password })
          .expect(200);

        const body = loginResponse.body as AuthTokensBody &
          Partial<ChallengeBody>;
        expect(body.twoFactorRequired).toBeUndefined();
        expect(typeof body.access_token).toBe('string');
      });
    });
  });
});
