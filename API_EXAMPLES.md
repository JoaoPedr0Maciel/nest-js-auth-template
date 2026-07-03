# Exemplos de Uso da API

Este arquivo contém exemplos práticos de como usar a API do template NestJS Authentication.

## 🔐 Autenticação

### 1. Registrar um novo usuário

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@exemplo.com",
    "phone": "+5511999999999",
    "password": "123456",
    "name": "Novo Usuário"
  }'
```

**Resposta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-aqui",
    "email": "novo@exemplo.com",
    "phone": "+5511999999999",
    "name": "Novo Usuário",
    "role": "USER",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 2. Fazer login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "123456"
  }'
```

**Resposta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-aqui",
    "phone": "+5511999990002",
    "name": "Regular User",
    "role": "USER"
  }
}
```

> Login e registro são limitados a 5 tentativas por minuto por IP (rate limiting). Excedendo o limite, a API responde `429 Too Many Requests`.

### 3. Obter perfil do usuário logado

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 4. Renovar tokens (refresh)

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "SEU_REFRESH_TOKEN_AQUI"}'
```

Retorna um novo par `access_token`/`refresh_token`. O refresh token usado é invalidado (rotação) — usá-lo de novo retorna `401 INVALID_REFRESH_TOKEN`.

### 5. Logout (revoga o refresh token atual)

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🛡️ Gerenciamento de Usuários (requer role ADMIN)

### 6. Listar usuários (paginado)

```bash
curl -X GET "http://localhost:3000/users?page=1&limit=15" \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

**Resposta:**

```json
{
  "data": [{ "id": "...", "email": "...", "phone": "...", "name": "...", "role": "USER" }],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 15,
    "pages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### 7. Obter usuário por ID

```bash
curl -X GET http://localhost:3000/users/USER_ID_AQUI \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

### 8. Criar novo usuário (via endpoint administrativo)

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{
    "email": "admin2@exemplo.com",
    "phone": "+5511988880000",
    "password": "senha123",
    "name": "Segundo Admin"
  }'
```

### 9. Atualizar usuário

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{
    "name": "Nome Atualizado"
  }'
```

### 10. Alterar senha de usuário (como admin)

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{
    "password": "nova_senha_123"
  }'
```

### 11. Alterar sua própria senha

```bash
curl -X PATCH http://localhost:3000/users/me/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "password": "minha_nova_senha"
  }'
```

### 12. Desativar usuário

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI/deactivate \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

### 13. Deletar usuário

```bash
curl -X DELETE http://localhost:3000/users/USER_ID_AQUI \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

## 🔍 Rotas Públicas

### 14. Rota raiz

```bash
curl -X GET http://localhost:3000/
```

### 15. Healthcheck (banco de dados e Redis)

```bash
curl -X GET http://localhost:3000/health
```

**Resposta:**

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" }, "redis": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" }, "redis": { "status": "up" } }
}
```

## ⚠️ Exemplos de Erros

Todas as exceções passam pelo filtro global e retornam nesse formato:

```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "path": "/users",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### 16. Acessar rota protegida sem token

```bash
curl -X GET http://localhost:3000/users
```

**Resposta (401)**

### 17. Acessar rota admin com usuário comum

```bash
# Login como USER
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123456"}'

# Tentar listar usuários (vai dar 403)
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer TOKEN_DO_USER"
```

**Resposta (403)**

## 📝 Script de teste rápido (Bash)

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testando API do NestJS Auth Template ==="

echo -e "\n1. Rota pública:"
curl -s "$BASE_URL/" | jq .

echo -e "\n2. Healthcheck:"
curl -s "$BASE_URL/health" | jq .

echo -e "\n3. Login como USER:"
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123456"}')
echo $USER_RESPONSE | jq .
USER_TOKEN=$(echo $USER_RESPONSE | jq -r '.access_token')

echo -e "\n4. Perfil do usuário:"
curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $USER_TOKEN" | jq .

echo -e "\n5. Login como ADMIN:"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "123456"}')
echo $ADMIN_RESPONSE | jq .
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.access_token')

echo -e "\n6. Listar usuários (como ADMIN):"
curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo -e "\n=== Teste concluído ==="
```

Para usar este script:

1. Salve como `test_api.sh`
2. Execute: `chmod +x test_api.sh && ./test_api.sh`

Credenciais do seed (`npm run prisma:seed`): `admin@example.com` / `user@example.com`, senha `123456`.

## 🧪 Testando com Postman

Importe esta collection no Postman:

```json
{
  "info": {
    "name": "NestJS Auth Template",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "access_token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@example.com\",\n  \"password\": \"123456\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/auth/login",
              "host": ["{{base_url}}"],
              "path": ["auth", "login"]
            }
          }
        },
        {
          "name": "Profile",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/auth/profile",
              "host": ["{{base_url}}"],
              "path": ["auth", "profile"]
            }
          }
        }
      ]
    }
  ]
}
```
