import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdatePasswordDto } from '../dto/update-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';

const idParam = ApiParam({
  name: 'id',
  description: 'ID do usuário',
  example: '1',
});
const forbiddenResponse = ApiResponse({
  status: 403,
  description: 'Acesso negado - apenas ADMIN',
});
const unauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Token JWT inválido',
});
const notFoundResponse = ApiResponse({
  status: 404,
  description: 'Usuário não encontrado',
});

export function ApiListUsers() {
  return applyDecorators(
    ApiOperation({ summary: 'Listar usuários paginados (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 15 }),
    ApiQuery({
      name: 'email',
      required: false,
      description: 'Filtra usuários cujo email contém este valor',
      example: 'joao',
    }),
    ApiQuery({
      name: 'phone',
      required: false,
      description: 'Filtra usuários cujo telefone contém este valor',
      example: '5511999',
    }),
    ApiResponse({
      status: 200,
      description: 'Lista de usuários obtida com sucesso',
      type: PaginatedUsersResponseDto,
    }),
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiGetUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Obter usuário por ID (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    idParam,
    ApiResponse({
      status: 200,
      description: 'Usuário encontrado com sucesso',
      type: UserResponseDto,
    }),
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Criar novo usuário (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    ApiBody({ type: CreateUserDto }),
    ApiResponse({
      status: 201,
      description: 'Usuário criado com sucesso',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Dados inválidos' }),
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiUpdateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Atualizar usuário (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    idParam,
    ApiBody({ type: UpdateUserDto }),
    ApiResponse({
      status: 200,
      description: 'Usuário atualizado com sucesso',
      type: UserResponseDto,
    }),
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiUpdateUserPassword() {
  return applyDecorators(
    ApiOperation({ summary: 'Atualizar senha de usuário (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    idParam,
    ApiBody({ type: UpdatePasswordDto }),
    ApiResponse({
      status: 200,
      description: 'Senha atualizada com sucesso',
      type: UserResponseDto,
    }),
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiUpdateMyPassword() {
  return applyDecorators(
    ApiOperation({ summary: 'Atualizar minha própria senha' }),
    ApiBearerAuth('JWT-auth'),
    ApiBody({ type: UpdatePasswordDto }),
    ApiResponse({
      status: 200,
      description: 'Senha atualizada com sucesso',
      type: UserResponseDto,
    }),
    unauthorizedResponse,
  );
}

export function ApiRemoveUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Excluir usuário (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    idParam,
    ApiResponse({ status: 204, description: 'Usuário excluído com sucesso' }),
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
  );
}

export function ApiDeactivateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Desativar usuário (apenas ADMIN)' }),
    ApiBearerAuth('JWT-auth'),
    idParam,
    ApiResponse({
      status: 200,
      description: 'Usuário desativado com sucesso',
      type: UserResponseDto,
    }),
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
  );
}
