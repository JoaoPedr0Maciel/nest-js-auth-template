import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Pagination } from '../../common/pagination';
import { ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../auth/interfaces/user.interface';
import {
  ApiCreateUser,
  ApiDeactivateUser,
  ApiGetUser,
  ApiListUsers,
  ApiRemoveUser,
  ApiUpdateMyPassword,
  ApiUpdateUser,
  ApiUpdateUserPassword,
} from './docs/users.swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiListUsers()
  findAll(@Query() pagination: Pagination) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiGetUser()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreateUser()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiUpdateUser()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN)
  @ApiUpdateUserPassword()
  updatePassword(
    @Param('id') id: string,
    @Body() { password }: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, password);
  }

  @Patch('me/password')
  @ApiUpdateMyPassword()
  updateMyPassword(
    @CurrentUser() user: RequestUser,
    @Body() { password }: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.id, password);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRemoveUser()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiDeactivateUser()
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
