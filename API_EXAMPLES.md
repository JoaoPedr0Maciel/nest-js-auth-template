# Exemplos de Uso da API

Este arquivo contém exemplos práticos de como usar a API do template NestJS Authentication.

## 🔐 Autenticação

### 1. Registrar um novo usuário

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@exemplo.com",
    "password": "123456",
    "name": "Novo Usuário",
    "role": "USER"
  }'
```

**Resposta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-aqui",
    "email": "novo@exemplo.com",
    "name": "Novo Usuário",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z"
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
  "user": {
    "id": "uuid-aqui",
    "email": "user@example.com",
    "name": "Regular User",
    "role": "USER"
  }
}
```

### 3. Obter perfil do usuário logado

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🛡️ Rotas com Autorização

### 4. Acessar rota protegida básica

```bash
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 5. Acessar rota que requer role ADMIN ou MASTER

```bash
# Primeiro faça login com um usuário ADMIN ou MASTER
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "123456"
  }'

# Depois use o token para acessar a rota
curl -X GET http://localhost:3000/admin \
  -H "Authorization: Bearer TOKEN_DO_ADMIN_AQUI"
```

### 6. Acessar rota que requer apenas role MASTER

```bash
# Login como MASTER
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@example.com",
    "password": "123456"
  }'

# Acessar rota exclusiva do MASTER
curl -X GET http://localhost:3000/master \
  -H "Authorization: Bearer TOKEN_DO_MASTER_AQUI"
```

## 👥 Gerenciamento de Usuários

### 7. Listar todos os usuários (requer ADMIN ou MASTER)

```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER"
```

### 8. Obter usuário por ID

```bash
curl -X GET http://localhost:3000/users/USER_ID_AQUI \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER"
```

### 9. Criar novo usuário (via endpoint administrativo)

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER" \
  -d '{
    "email": "admin2@exemplo.com",
    "password": "senha123",
    "name": "Segundo Admin",
    "role": "ADMIN"
  }'
```

### 10. Atualizar usuário

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER" \
  -d '{
    "name": "Nome Atualizado",
    "role": "ADMIN"
  }'
```

### 11. Alterar senha de usuário (como admin)

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER" \
  -d '{
    "password": "nova_senha_123"
  }'
```

### 12. Alterar sua própria senha

```bash
curl -X PATCH http://localhost:3000/users/me/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "password": "minha_nova_senha"
  }'
```

### 13. Desativar usuário

```bash
curl -X PATCH http://localhost:3000/users/USER_ID_AQUI/deactivate \
  -H "Authorization: Bearer TOKEN_ADMIN_OU_MASTER"
```

### 14. Deletar usuário (apenas MASTER)

```bash
curl -X DELETE http://localhost:3000/users/USER_ID_AQUI \
  -H "Authorization: Bearer TOKEN_MASTER"
```

## 🔍 Rotas Públicas

### 15. Acessar rota pública (sem autenticação)

```bash
curl -X GET http://localhost:3000/
```

## ⚠️ Exemplos de Erros

### 16. Tentar acessar rota protegida sem token

```bash
curl -X GET http://localhost:3000/protected
```

**Resposta (401):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 25. Tentar acessar rota admin com usuário comum

```bash
# Login como USER
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "123456"
  }'

# Tentar acessar rota admin (vai dar erro 403)
curl -X GET http://localhost:3000/admin \
  -H "Authorization: Bearer TOKEN_DO_USER"
```

**Resposta (403):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## 📝 Scripts para Teste Rápido

### Script de teste completo (Bash)

```bash
#!/bin/bash

# Definir URL base
BASE_URL="http://localhost:3000"

echo "=== Testando API do NestJS Auth Template ==="

# 1. Rota pública
echo -e "\n1. Testando rota pública:"
curl -s "$BASE_URL/" | jq .

# 2. Login como USER
echo -e "\n2. Login como USER:"
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123456"}')
echo $USER_RESPONSE | jq .

USER_TOKEN=$(echo $USER_RESPONSE | jq -r '.access_token')

# 3. Perfil do usuário
echo -e "\n3. Perfil do usuário:"
curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $USER_TOKEN" | jq .

# 4. Login como ADMIN
echo -e "\n4. Login como ADMIN:"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "123456"}')
echo $ADMIN_RESPONSE | jq .

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.access_token')

# 5. Listar usuários (como admin)
echo -e "\n5. Listar usuários (como ADMIN):"
curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo -e "\n=== Teste concluído ==="
```

Para usar este script:

1. Salve como `test_api.sh`
2. Execute: `chmod +x test_api.sh && ./test_api.sh`

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
