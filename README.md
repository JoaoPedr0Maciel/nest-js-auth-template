# NestJS Authentication Template

Template NestJS com autenticação JWT, autorização baseada em roles e Prisma ORM.

## Funcionalidades

- Autenticação JWT
- Hash de senhas com bcrypt
- Autorização baseada em roles (USER, ADMIN)
- Decorators `@Roles`, `@CurrentUser`, `@Public`
- Prisma ORM com PostgreSQL
- Redis para cache
- Docker Compose com PostgreSQL, PgAdmin4 e Redis
- Swagger/OpenAPI em `/api/docs`
- Validação com class-validator

## Configuração

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha as variáveis
3. Suba os serviços: `docker-compose up -d`
4. Configure o banco:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run prisma:seed`
5. Inicie: `npm run start:dev`

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

## Arquitetura

### Estrutura de pastas

```
src/
├── common/
│   ├── decorators/
│   ├── errors/
│   ├── interfaces/
│   ├── pagination/
│   └── utils/
├── infra/
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
| `common/` | Tudo compartilhado por mais de um módulo: decorators, erros, paginação, interfaces, utils. |
| `infra/` | Conexões com banco, cache e serviços externos. |
| Raiz de `src/` | Apenas `app.module.ts`, `app.controller.ts`, `app.service.ts` e `main.ts`. |
| `prisma/` (raiz do projeto) | Schema e migrations do banco. |

### Dentro de um módulo (`modules/<nome>/`)

| O que adicionar | Onde |
|-----------------|------|
| Controller, service, module | Raiz do módulo |
| DTOs | `dto/` ou `dtos/` |
| Guards, pipes, interceptors | `guards/`, `pipes/`, `interceptors/` |
| Decorators do módulo | `decorators/` |
| Interfaces e types do módulo | `interfaces/` |

### Em `common/`

| O que adicionar | Onde |
|-----------------|------|
| Decorator compartilhado | `common/decorators/` |
| Exceções reutilizáveis | `common/errors/` |
| Paginação | `common/pagination/` |
| Interfaces/types globais | `common/interfaces/` |
| Funções utilitárias | `common/utils/` |

### Em `infra/`

Cada recurso em sua própria pasta com `<recurso>.service.ts` e `<recurso>.module.ts`. Ex.: `infra/prisma/`, `infra/redis/`. Novo serviço externo = nova pasta aqui.

## Segurança

- **JwtAuthGuard** – aplicado globalmente; valida o token e injeta o usuário na request. Rotas marcadas com `@Public()` são ignoradas.
- **RolesGuard** – restringe acesso por role junto ao decorator `@Roles()`.

### Roles

| Role | Permissões |
|------|-----------|
| `USER` | Acesso básico |
| `ADMIN` | Gerenciamento de usuários e recursos administrativos |

## Licença

MIT
