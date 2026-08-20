# NestJS Authentication Template

Template NestJS com autenticação JWT, autorização baseada em roles e Prisma ORM.

## Funcionalidades

- Autenticação JWT com access token + refresh token (rotação a cada uso, revogável via `/auth/logout`)
- Autenticação em dois fatores (2FA/TOTP, compatível com Google Authenticator) — ver seção [Autenticação em dois fatores (2FA)](#autenticação-em-dois-fatores-2fa)
- Hash de senhas com bcrypt
- Autorização baseada em permissões com CASL (roles `USER`/`ADMIN` mapeadas pra abilities via `@CheckPolicies`)
- Decorators `@CheckPolicies`, `@CurrentUser`, `@Public`
- Prisma ORM 7 (com driver adapters) + PostgreSQL
- Docker Compose com PostgreSQL, PgAdmin4 e a própria aplicação
- Swagger/OpenAPI em `/api/docs`
- Validação com class-validator (telefone validado via `@IsPhoneNumber()`, formato internacional E.164)
- Helmet + CORS configurável por env
- Rate limiting (`@nestjs/throttler`), mais restritivo em `/auth/login` e `/auth/register`
- Healthcheck em `/health` (Prisma) via `@nestjs/terminus`
- Filtro de exceção global com formato de erro padronizado
- Validação de variáveis de ambiente na inicialização (Zod) — boot falha cedo, com mensagem clara, se faltar algo
- Paginação (`shared/pagination`) em endpoints de listagem, ex. `GET /users?page=1&limit=15`
- CI (GitHub Actions): lint, build, testes unitários e e2e

## Configuração

1. Instale as dependências: `npm install` (roda `prisma generate` automaticamente via `postinstall`)
2. Copie `env.example` para `.env` e preencha as variáveis
3. Suba o banco: `docker-compose up -d postgres pgadmin`
4. Configure o banco:
   - `npm run prisma:migrate`
   - `npm run prisma:seed` (não roda mais automaticamente após `migrate dev` no Prisma 7 — sempre manual)
5. Inicie: `npm run start:dev`

Credenciais do seed: `admin@example.com` (role `ADMIN`) e `user@example.com` (role `USER`), senha `123456`.

### Rodando com Docker (app incluída)

`docker-compose up -d` também sobe a aplicação (serviço `app`), que builda a partir do `Dockerfile` multi-stage na raiz. Rode as migrations/seed contra o banco do compose antes ou depois de subir, conforme necessário.

## Scripts

| Comando                   | Descrição                        |
| ------------------------- | -------------------------------- |
| `npm run start:dev`       | Modo desenvolvimento             |
| `npm run build`           | Build para produção              |
| `npm run prisma:generate` | Gerar cliente Prisma             |
| `npm run prisma:migrate`  | Executar migrations              |
| `npm run prisma:seed`     | Popular banco com dados iniciais |
| `npm run db:reset`        | Reset completo do banco          |
| `npm run test`            | Testes unitários                 |
| `npm run test:e2e`        | Testes end-to-end                |
| `npm run lint`            | Lint (ESLint flat config)        |

## Arquitetura

### Estrutura de pastas

```
src/
├── shared/
│   ├── decorators/
│   ├── filters/
│   ├── interfaces/
│   ├── pagination/
│   └── utils/
├── config/
│   └── env.validation.ts
├── infra/
│   ├── health/
│   └── prisma/
├── modules/
│   └── <nome>/
│       ├── decorators/
│       ├── dto/
│       ├── errors/
│       ├── filters/
│       ├── guards/
│       ├── interfaces/
│       ├── <nome>.controller.ts
│       ├── <nome>.service.ts
│       └── <nome>.module.ts
├── app.module.ts
└── main.ts
```

### Onde colocar cada coisa

| Pasta                       | O que vai aqui                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `modules/`                  | Funcionalidades de negócio. Novo domínio = nova pasta aqui.                                                 |
| `shared/`                   | Tudo compartilhado por mais de um módulo: decorators, filtros, paginação, interfaces, utils.                |
| `infra/`                    | Conexões com banco e serviços externos (cada recurso em sua própria pasta: `infra/prisma`, `infra/health`). |
| `config/`                   | Validação e schemas de configuração (env vars).                                                             |
| Raiz de `src/`              | Apenas `app.module.ts`, `app.controller.ts`, `app.service.ts` e `main.ts`.                                  |
| `prisma/` (raiz do projeto) | Schema e migrations do banco.                                                                               |

### Dentro de um módulo (`modules/<nome>/`)

| O que adicionar                                                                  | Onde                                 |
| -------------------------------------------------------------------------------- | ------------------------------------ |
| Controller, service, module                                                      | Raiz do módulo                       |
| DTOs                                                                             | `dto/`                               |
| Guards, pipes, interceptors                                                      | `guards/`, `pipes/`, `interceptors/` |
| Decorators do módulo                                                             | `decorators/`                        |
| Interfaces e types do módulo                                                     | `interfaces/`                        |
| Catálogo de erros do módulo                                                      | `errors/index.ts`                    |
| Filtros de listagem do módulo (DTO de query + `where` do Prisma)                 | `filters/index.ts`                   |
| Schemas Zod (validação de dado que não passou pelo `ValidationPipe`)             | `schemas/`                           |
| Decorators compostos de Swagger por rota (`@ApiLogin()`, `@ApiListUsers()`, ...) | `docs/<nome>.swagger.ts`             |

### Filtros de listagem

- Cada módulo com endpoint de listagem declara seu próprio filtro em `modules/<nome>/filters/`: um DTO que estende `Pagination` (ex. `UserQueryDto`, com `email`/`phone` opcionais) e uma função que traduz o DTO num `where` do Prisma (ex. `buildUsersWhere`).
- Não existe um filtro genérico compartilhado — os campos e o `where` são específicos de cada recurso, então ficam isolados no próprio módulo (ver `modules/users/filters/`).
- O controller recebe só esse DTO combinado via `@Query()` (paginação + filtro juntos); o service monta o `where` e passa pro `findMany`/`count`.

### Tratamento de erros

- Cada módulo declara seus próprios erros em `modules/<nome>/errors/index.ts`, exportando um objeto `Errors` com exceções concretas do Nest já com `message` (PT-BR) e `code` machine-readable no corpo (ex. `Errors.notFound()` → `USER_NOT_FOUND`, `Errors.invalidRefreshToken()` → `INVALID_REFRESH_TOKEN`). Sem fábrica genérica compartilhada: cada erro é explícito e fica só no arquivo do seu módulo.
- Ao importar `Errors` de mais de um módulo no mesmo arquivo (ex. `AuthService` usa erros de `auth` e de `users`), renomeie no import: `import { Errors as userErrors } from '../users/errors'`.
- `HttpExceptionFilter` (global, em `shared/filters/`) captura qualquer exceção e padroniza a resposta: `{ statusCode, code, message, path, timestamp }`.

## Segurança

- **JwtAuthGuard** – aplicado globalmente; valida o token e injeta o usuário na request. Rotas marcadas com `@Public()` são ignoradas.
- **PoliciesGuard** – restringe acesso via CASL (`modules/auth/casl/`), junto ao decorator `@CheckPolicies((ability) => ability.can(action, subject))`.
- **ThrottlerGuard** – aplicado globalmente (30 req/min por IP); `/auth/login` e `/auth/register` têm limite próprio (5 req/min).
- **Helmet** – cabeçalhos de segurança HTTP padrão.
- **CORS** – configurável via `CORS_ORIGIN` (lista separada por vírgula, ou `*`).
- **Refresh token** – `POST /auth/login` e `POST /auth/register` retornam `access_token` (curto, `JWT_EXPIRES_IN`) e `refresh_token` (longo, `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`). `POST /auth/refresh` troca o refresh token por um par novo (rotação: o antigo é invalidado). O `tokenId` válido de cada usuário fica em `User.refreshTokenId`/`refreshTokenExpiresAt`; `POST /auth/logout` zera essas colunas e revoga o refresh token atual.

### Autorização (CASL)

Cada role vira uma `ability` no login, montada por `CaslAbilityFactory` a partir do mapa em `modules/auth/casl/permissions.ts`. Rotas checam a ability, não a role diretamente — o que abre espaço pra regras condicionais (ex. "só o dono do recurso") sem trocar o mecanismo:

| Role    | Abilities                    |
| ------- | ---------------------------- |
| `USER`  | Nenhuma sobre `User`         |
| `ADMIN` | `manage` (tudo) sobre `User` |

Pra adicionar uma permissão nova: declare a action/subject em `actions.ts`/`subjects.ts` se ainda não existir, ajuste `permissions.ts` e use `@CheckPolicies((ability) => ability.can(action, subject))` na rota.

## Autenticação em dois fatores (2FA)

TOTP (RFC 6238), compatível com Google Authenticator e apps similares. Endpoints em `modules/two-factor/`, sob `/auth/2fa`:

| Rota                                       | Autenticação         | Descrição                                                                       |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------- |
| `POST /auth/2fa/setup`                     | JWT                  | Gera um segredo pendente + QR code (`otpauth://`). Nada é persistido ainda.     |
| `POST /auth/2fa/setup/confirm`             | JWT                  | Confirma com um código válido, ativa o 2FA e retorna os códigos de recuperação. |
| `POST /auth/2fa/disable`                   | JWT + senha + código | Desativa o 2FA e invalida segredo e códigos de recuperação anteriores.          |
| `POST /auth/2fa/recovery-codes/regenerate` | JWT + senha + código | Gera um novo lote de códigos de recuperação, invalidando o anterior.            |
| `POST /auth/2fa/verify`                    | `challengeToken`     | Segunda etapa do login: completa a autenticação com um código do autenticador.  |
| `POST /auth/2fa/verify/recovery`           | `challengeToken`     | Segunda etapa do login usando um código de recuperação (não desativa o 2FA).    |

**Fluxo de login com 2FA ativo**: `POST /auth/login` valida a senha e, se `twoFactorEnabled`, não emite tokens — responde `{ twoFactorRequired: true, challengeToken }`. O `challengeToken` (linha em `TwoFactorLoginChallenge`, com `expiresAt` = `TWO_FACTOR_CHALLENGE_TTL_SECONDS`) é trocado por tokens em `POST /auth/2fa/verify`. Tentativas inválidas incrementam `attempts` na mesma linha; ao atingir o limite, o desafio inteiro é apagado e é preciso logar de novo — mesma proteção contra força bruta do login por senha.

**Segredo TOTP**: cifrado (AES-256-GCM, chave derivada de `TWO_FACTOR_ENCRYPTION_KEY`) em `User.twoFactorSecret` — precisa ser recuperável a cada login, então não pode ser hash como senha. Antes da confirmação, o segredo pendente fica cifrado em `User.twoFactorPendingSecret`/`twoFactorPendingSecretExpiresAt` (TTL de 10 min) — só vira `twoFactorSecret` definitivo com o 2FA confirmado e ativado.

**Códigos de recuperação**: 10 códigos (`XXXX-XXXX`) gerados na confirmação, guardados com hash bcrypt (`TwoFactorRecoveryCode`, uso único via `usedAt`). Regenerar apaga o lote anterior por completo.

**Auditoria**: `TwoFactorAuditLog` registra `ENABLED`, `DISABLED`, `RECOVERY_CODES_REGENERATED` e `RECOVERY_CODE_USED` por usuário.

## Prisma 7

Este template usa Prisma ORM 7, que exige **driver adapters** (sem mais motor Rust embutido):

- `prisma.config.ts` na raiz define o schema e a URL do datasource para o CLI (migrations).
- `PrismaService` instancia o `PrismaClient` com `@prisma/adapter-pg`, lendo `DATABASE_URL` do `ConfigService`.
- O bloco `datasource` do `schema.prisma` não tem mais `url` — isso agora vive em `prisma.config.ts`/no adapter.
- `prisma migrate dev`/`reset` não rodam mais o seed automaticamente; use `npm run prisma:seed`.

## Follow-ups conhecidos

- `tsconfig.json` mantém `strictNullChecks`/`noImplicitAny` desligados por compatibilidade com o código existente. Ativar isso é uma melhoria válida, mas exige revisar bastante código — não foi feito aqui para não ampliar o escopo desta atualização.

## Licença

MIT
