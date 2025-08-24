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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.ADMIN, Role.MASTER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MASTER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MASTER)
  create(@Body() createUserDto: {
    email: string;
    password: string;
    name: string;
    role?: Role;
  }) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MASTER)
  update(@Param('id') id: string, @Body() updateUserDto: Partial<{
    email: string;
    name: string;
    role: Role;
    isActive: boolean;
  }>) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN, Role.MASTER)
  updatePassword(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.updatePassword(id, password);
  }

  @Patch('me/password')
  updateMyPassword(@CurrentUser() user: any, @Body('password') password: string) {
    return this.usersService.updatePassword(user.id, password);
  }

  @Delete(':id')
  @Roles(Role.MASTER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.MASTER)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
