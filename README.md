# NestJS Authentication Template

Um template completo do NestJS com autenticação JWT, autorização baseada em roles e Prisma ORM.

## 🚀 Funcionalidades

- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Hash de senhas** com bcrypt
- ✅ **Autorização baseada em roles** (USER, ADMIN)
- ✅ **Decorator @Roles** para controle de acesso
- ✅ **Guards personalizados** (JWT, Local, Roles)
- ✅ **Decorator @CurrentUser** para obter usuário atual
- ✅ **Decorator @Public** para rotas públicas
- ✅ **Prisma ORM** com PostgreSQL
- ✅ **Redis** completo para cache e operações avançadas
- ✅ **Docker Compose** com PostgreSQL, PgAdmin4 e Redis
- ✅ **Swagger/OpenAPI** para documentação
- ✅ **Validação de dados** com class-validator
- ✅ **Seed inicial** com usuários padrão

## 🏗️ Estrutura do Projeto

```
src/
├── common/                      # Código compartilhado entre módulos
│   ├── decorators/
│   │   └── is-br-phone.decorator.ts   # Validação de telefone BR
│   ├── errors/
│   │   └── errors.ts                 # Exceções reutilizáveis (user not found, etc.)
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts  # Tipos JWT
│   ├── pagination/
│   │   ├── pagination.types.ts       # Interfaces de paginação
│   │   ├── pagination.ts             # DTO e helpers de paginação
│   │   └── index.ts
│   └── utils/
│       └── phone-validation.util.ts  # Utilitários de validação
├── infra/                        # Configurações de infraestrutura (DB, cache)
│   ├── prisma/
│   │   ├── prisma.service.ts         # Service do Prisma
│   │   └── prisma.module.ts          # Módulo do Prisma
│   └── redis/
│       ├── redis.service.ts          # Service Redis
│       └── redis.module.ts            # Módulo Redis
├── modules/
│   ├── auth/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   │   ├── public.decorator.ts         # @Public()
│   │   │   └── roles.decorator.ts          # @Roles()
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts           # Guard JWT
│   │   │   └── roles.guard.ts              # Guard de Roles
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── interfaces/
│   │       └── user.interface.ts
│   └── users/
│       ├── dtos/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

- **`common/`** – decorators, erros, paginação, interfaces e utils usados por vários módulos.
- **`infra/`** – acesso a dados e serviços externos (Prisma, Redis). Schema e migrations do Prisma ficam na pasta `prisma/` na raiz do projeto.
- **`modules/`** – módulos de negócio (auth, users). Cada um com controller, service, DTOs e guards próprios.

## 🛠️ Configuração e Instalação

### 1. Clonar e instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/nestjs_auth?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Redis
REDIS_URL="redis://localhost:6379"

# Application
PORT=3000
NODE_ENV=development
```

### 3. Subir o Docker Compose

```bash
docker-compose up -d
```

Isso irá subir:

- **PostgreSQL** (porta 5432)
- **PgAdmin4** (porta 8080) - admin@admin.com / admin123
- **Redis** (porta 6379)

### 4. Configurar o banco de dados

```bash
# Gerar o cliente Prisma
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# Seed inicial (cria usuários padrão)
npm run prisma:seed
```

### 5. Executar a aplicação

```bash
# Modo desenvolvimento
npm run start:dev

# Modo produção
npm run start:prod
```

## 👥 Usuários Padrão

Após executar o seed, usuários de exemplo são criados (credenciais e formatos podem variar conforme o seed). Use a documentação Swagger em `/api/docs` para testar login e endpoints.

## 🔐 Como Usar os Decorators

### @Public() - Rotas Públicas

```typescript
@Controller('example')
export class ExampleController {
  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'Esta rota é pública' };
  }
}
```

### @Roles() - Controle de Acesso

```typescript
@Controller('admin')
export class AdminController {
  @Roles(Role.ADMIN)
  @Get('dashboard')
  getDashboard() {
    return { message: 'Apenas ADMIN pode acessar' };
  }

  @Roles(Role.ADMIN)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return { message: 'Apenas ADMIN pode deletar usuários' };
  }
}
```

### @CurrentUser() - Obter Usuário Atual

```typescript
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: RequestUser) {
    return {
      message: `Olá, ${user.name}!`,
      user,
    };
  }
}
```

### Combinando Guards

```typescript
@Controller('secure')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplicado em todo o controller
export class SecureController {
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminData(@CurrentUser() user: RequestUser) {
    return { message: 'Dados administrativos', user };
  }
}
```

## 🔥 Redis

O template inclui um RedisService completo para trabalhar com Redis:

```typescript
@Injectable()
export class ExampleService {
  constructor(private redisService: RedisService) {}

  async exemploUsoRedis() {
    // Cache básico
    await this.redisService.set('user:123', JSON.stringify(userData), 3600);
    const userData = await this.redisService.get('user:123');

    // Incrementar contador
    await this.redisService.incr('user_visits');

    // Trabalhar com listas
    await this.redisService.rpush('recent_users', 'user123');
    const recentUsers = await this.redisService.lrange('recent_users', 0, 9);

    // Trabalhar com sets (conjuntos únicos)
    await this.redisService.sadd('active_users', 'user123');
    const activeUsers = await this.redisService.smembers('active_users');

    // Trabalhar com hashes
    await this.redisService.hset(
      'user_stats',
      'user123',
      JSON.stringify(stats),
    );
    const stats = await this.redisService.hget('user_stats', 'user123');

    // Verificar se chave existe
    const exists = await this.redisService.exists('user:123');

    // Definir TTL
    await this.redisService.expire('temp_data', 300); // 5 minutos
  }
}
```

## 📡 Endpoints da API

### Autenticação

```bash
# Registrar usuário
POST /auth/register
{
  "email": "novo@exemplo.com",
  "password": "123456",
  "name": "Novo Usuário",
  "role": "USER" // opcional
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "123456"
}

# Perfil (requer autenticação)
GET /auth/profile
Authorization: Bearer <token>

# Endpoint apenas para ADMINs
GET /auth/admin-only
Authorization: Bearer <token>

# Endpoint apenas para ADMIN
GET /auth/admin-only
Authorization: Bearer <token>
```

### Usuários (requer role ADMIN)

```bash
# Listar usuários
GET /users
Authorization: Bearer <token>

# Obter usuário por ID
GET /users/:id
Authorization: Bearer <token>

# Criar usuário
POST /users
Authorization: Bearer <token>

# Atualizar usuário
PATCH /users/:id
Authorization: Bearer <token>

# Excluir usuário (apenas ADMIN)
DELETE /users/:id
Authorization: Bearer <token>
```

## 📚 Documentação da API

Acesse a documentação Swagger em: `http://localhost:3000/api/docs`

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Prisma
npm run prisma:generate    # Gerar cliente
npm run prisma:migrate     # Executar migrations
npm run prisma:seed        # Executar seed
npm run db:reset          # Reset do banco

# Testes
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:cov          # Coverage
```

## 🐳 Docker

O projeto inclui um `docker-compose.yml` configurado com:

- **PostgreSQL**: Banco de dados principal
- **PgAdmin4**: Interface web para gerenciar o PostgreSQL
- **Redis**: Cache e sessões (configurado mas não implementado no template)

## 🛡️ Estrutura de Segurança

### Guards Implementados

1. **JwtAuthGuard**: Valida o token JWT e anexa o usuário à request (aplicado globalmente; rotas com `@Public()` são ignoradas).
2. **RolesGuard**: Restringe acesso por role (usa o decorator `@Roles()`).

### Hierarquia de Roles

```
ADMIN > USER
```

- **ADMIN**: Acesso administrativo (gerenciar usuários, listar, criar, editar, excluir, desativar).
- **USER**: Acesso básico (perfil, rotas públicas e rotas permitidas ao USER).

## 📝 Licença

MIT
