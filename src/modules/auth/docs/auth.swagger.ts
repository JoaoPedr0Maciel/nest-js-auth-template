import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { RegisterResponseDto } from '../dto/register-response.dto';
import { AuthTokensResponseDto } from '../dto/auth-tokens-response.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';

/**
 * Cada `Api*` aqui é o Swagger de uma única rota do AuthController,
 * fora do controller — o controller aplica uma linha (`@ApiLogin()`)
 * em vez de carregar `@ApiOperation` + `@ApiResponse` x N por cima do
 * método. Ver README > "Dentro de um módulo" para a convenção.
 */

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ summary: 'Fazer login no sistema' }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description: 'Login realizado com sucesso',
      type: LoginResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Credenciais inválidas' }),
  );
}

export function ApiRegister() {
  return applyDecorators(
    ApiOperation({ summary: 'Registrar novo usuário' }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      status: 201,
      description: 'Usuário criado com sucesso',
      type: RegisterResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Dados inválidos' }),
    ApiResponse({ status: 409, description: 'Usuário já existe' }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({ summary: 'Renovar access token usando o refresh token' }),
    ApiBody({ type: RefreshTokenDto }),
    ApiResponse({
      status: 200,
      description: 'Tokens renovados com sucesso',
      type: AuthTokensResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Refresh token inválido ou expirado',
    }),
  );
}

export function ApiLogout() {
  return applyDecorators(
    ApiOperation({ summary: 'Revogar o refresh token do usuário autenticado' }),
    ApiBearerAuth('JWT-auth'),
    ApiResponse({ status: 204, description: 'Logout realizado com sucesso' }),
    ApiResponse({ status: 401, description: 'Token JWT inválido' }),
  );
}

export function ApiProfile() {
  return applyDecorators(
    ApiOperation({ summary: 'Obter perfil do usuário autenticado' }),
    ApiBearerAuth('JWT-auth'),
    ApiResponse({
      status: 200,
      description: 'Perfil do usuário obtido com sucesso',
      type: ProfileResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Token JWT inválido' }),
  );
}
