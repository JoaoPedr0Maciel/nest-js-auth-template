import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuários obtida com sucesso',
    schema: {
      example: [
        {
          id: '1',
          phone: '+244923456789',
          name: 'João Silva',
          role: 'USER',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obter usuário por ID (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: '1' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário encontrado com sucesso'
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso'
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  @ApiBody({ type: CreateUserDto })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar usuário (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: '1' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário atualizado com sucesso'
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  @ApiBody({ type: UpdateUserDto })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar senha de usuário (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: '1' })
  @ApiResponse({ 
    status: 200, 
    description: 'Senha atualizada com sucesso'
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        password: {
          type: 'string',
          description: 'Nova senha (mínimo 6 caracteres)',
          example: '123456',
          minLength: 6
        }
      },
      required: ['password']
    }
  })
  updatePassword(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.updatePassword(id, password);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Atualizar minha própria senha' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 200, 
    description: 'Senha atualizada com sucesso'
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        password: {
          type: 'string',
          description: 'Nova senha (mínimo 6 caracteres)',
          example: '123456',
          minLength: 6
        }
      },
      required: ['password']
    }
  })
  updateMyPassword(@CurrentUser() user: any, @Body('password') password: string) {
    return this.usersService.updatePassword(user.id, password);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir usuário (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: '1' })
  @ApiResponse({ 
    status: 204, 
    description: 'Usuário excluído com sucesso'
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desativar usuário (apenas ADMIN)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: '1' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário desativado com sucesso'
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas ADMIN' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
