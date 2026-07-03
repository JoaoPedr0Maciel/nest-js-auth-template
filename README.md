# NestJS Authentication Template

Template NestJS com autenticação JWT, autorização baseada em roles e Prisma ORM.

## Funcionalidades

- Autenticação JWT com access token + refresh token (rotação a cada uso, revogável via `/auth/logout`)
- Hash de senhas com bcrypt
- Autorização baseada em roles (USER, ADMIN)
- Decorators `@Roles`, `@CurrentUser`, `@Public`
- Prisma ORM 7 (com driver adapters) + PostgreSQL
- Redis para cache
- Docker Compose com PostgreSQL, PgAdmin4, Redis e a própria aplicação
- Swagger/OpenAPI em `/api/docs`
- Validação com class-validator (telefone validado via `@IsPhoneNumber()`, formato internacional E.164)
- Helmet + CORS configurável por env
- Rate limiting (`@nestjs/throttler`), mais restritivo em `/auth/login` e `/auth/register`
- Healthcheck em `/health` (Prisma + Redis) via `@nestjs/terminus`
- Filtro de exceção global com formato de erro padronizado
- Validação de variáveis de ambiente na inicialização (Joi)
- Paginação (`common/pagination`) em endpoints de listagem, ex. `GET /users?page=1&limit=15`
- CI (GitHub Actions): lint, build, testes unitários e e2e

## Configuração

1. Instale as dependências: `npm install` (roda `prisma generate` automaticamente via `postinstall`)
2. Copie `env.example` para `.env` e preencha as variáveis
3. Suba os serviços de banco/cache: `docker-compose up -d postgres redis pgadmin`
4. Configure o banco:
   - `npm run prisma:migrate`
   - `npm run prisma:seed` (não roda mais automaticamente após `migrate dev` no Prisma 7 — sempre manual)
5. Inicie: `npm run start:dev`

Credenciais do seed: `admin@example.com` (role `ADMIN`) e `user@example.com` (role `USER`), senha `123456`.

### Rodando com Docker (app incluída)

`docker-compose up -d` também sobe a aplicação (serviço `app`), que builda a partir do `Dockerfile` multi-stage na raiz. Rode as migrations/seed contra o banco do compose antes ou depois de subir, conforme necessário.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Modo desenvolvimento |
| `npm run build` | Build para produção |
| `npm run prisma:generate` | Gerar cliente Prisma |
| `npm run prisma:migrate` | Executar migrations |
| `npm run prisma:seed` | Popular banco com dados iniciais |
| `npm run db:reset` | Reset completo do banco |
| `npm run test` | Testes unitários |
| `npm run test:e2e` | Testes end-to-end |
| `npm run lint` | Lint (ESLint flat config) |

## Arquitetura

### Estrutura de pastas

```
src/
├── common/
│   ├── decorators/
│   ├── errors/
│   ├── filters/
│   ├── interfaces/
│   ├── pagination/
│   └── utils/
├── config/
│   └── env.validation.ts
├── infra/
│   ├── health/
│   ├── prisma/
│   └── redis/
├── modules/
│   └── <nome>/
│       ├── decorators/
│       ├── dto/
│       ├── guards/
│       ├── interfaces/
│       ├── <nome>.controller.ts
│       ├── <nome>.service.ts
│       └── <nome>.module.ts
├── app.module.ts
└── main.ts
```

### Onde colocar cada coisa

| Pasta | O que vai aqui |
|-------|----------------|
| `modules/` | Funcionalidades de negócio. Novo domínio = nova pasta aqui. |
| `common/` | Tudo compartilhado por mais de um módulo: decorators, erros, filtros, paginação, interfaces, utils. |
| `infra/` | Conexões com banco, cache e serviços externos (cada recurso em sua própria pasta: `infra/prisma`, `infra/redis`, `infra/health`). |
| `config/` | Validação e schemas de configuração (env vars). |
| Raiz de `src/` | Apenas `app.module.ts`, `app.controller.ts`, `app.service.ts` e `main.ts`. |
| `prisma/` (raiz do projeto) | Schema e migrations do banco. |

### Dentro de um módulo (`modules/<nome>/`)

| O que adicionar | Onde |
|-----------------|------|
| Controller, service, module | Raiz do módulo |
| DTOs | `dto/` |
| Guards, pipes, interceptors | `guards/`, `pipes/`, `interceptors/` |
| Decorators do módulo | `decorators/` |
| Interfaces e types do módulo | `interfaces/` |

## Segurança

- **JwtAuthGuard** – aplicado globalmente; valida o token e injeta o usuário na request. Rotas marcadas com `@Public()` são ignoradas.
- **RolesGuard** – restringe acesso por role junto ao decorator `@Roles()`.
- **ThrottlerGuard** – aplicado globalmente (30 req/min por IP); `/auth/login` e `/auth/register` têm limite próprio (5 req/min).
- **Helmet** – cabeçalhos de segurança HTTP padrão.
- **CORS** – configurável via `CORS_ORIGIN` (lista separada por vírgula, ou `*`).
- **Refresh token** – `POST /auth/login` e `POST /auth/register` retornam `access_token` (curto, `JWT_EXPIRES_IN`) e `refresh_token` (longo, `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`). `POST /auth/refresh` troca o refresh token por um par novo (rotação: o antigo é invalidado). O `tokenId` válido de cada usuário fica no Redis (`refresh-token:<userId>`); `POST /auth/logout` remove essa chave e revoga o refresh token atual.

### Roles

| Role | Permissões |
|------|-----------|
| `USER` | Acesso básico |
| `ADMIN` | Gerenciamento de usuários e recursos administrativos |

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
