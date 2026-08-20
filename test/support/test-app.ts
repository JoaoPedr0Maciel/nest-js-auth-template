import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter';
import { PrismaService } from '../../src/infra/prisma/prisma.service';

/**
 * Marca usada em todo usuário criado por este helper, pra `cleanupE2eUsers`
 * apagar exatamente as linhas que os specs e2e criaram sem tocar em dado
 * real do banco de dev compartilhado em que os testes rodam.
 */
export const E2E_EMAIL_PREFIX = 'e2e-test';

export async function bootstrapTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Espelha os pipes/filters registrados em src/main.ts — bootar via
  // AppModule direto pula o main.ts, então o comportamento global precisa
  // ser religado aqui pra bater com o request handling de produção.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

export function uniqueEmail(): string {
  return `${E2E_EMAIL_PREFIX}-${randomUUID()}@example.com`;
}

/**
 * Número móvel brasileiro em E.164 válido, único o bastante pra evitar colisão entre testes.
 * O sufixo precisa ter 8 dígitos — DDD (2) + 9 (nono dígito) + 8 dígitos = 11 dígitos
 * nacionais — senão `libphonenumber-js/max` (usado por `@IsPhoneNumber()`) rejeita o número.
 */
export function uniquePhone(): string {
  const suffix = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `+55119${suffix}`;
}

export async function createUserDirectly(
  prisma: PrismaService,
  overrides: Partial<{
    email: string;
    phone: string;
    password: string;
    name: string;
    role: Role;
  }> = {},
): Promise<{
  user: Awaited<ReturnType<PrismaService['user']['create']>>;
  password: string;
}> {
  const password = overrides.password ?? 'senha123';

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? uniqueEmail(),
      phone: overrides.phone ?? uniquePhone(),
      password: await bcrypt.hash(password, 10),
      name: overrides.name ?? 'E2E Test User',
      role: overrides.role ?? Role.USER,
    },
  });

  return { user, password };
}

export async function cleanupE2eUsers(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { contains: E2E_EMAIL_PREFIX } },
  });
}
