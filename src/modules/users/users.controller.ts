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
import { PoliciesGuard } from '../auth/casl/policies.guard';
import { CheckPolicies } from '../auth/casl/check-policies.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserQueryDto } from './filters';
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
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
  @ApiListUsers()
  findAll(@Query() filter: UserQueryDto) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'User'))
  @ApiGetUser()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'User'))
  @ApiCreateUser()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  @ApiUpdateUser()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // Precisa vir antes de ':id/password' — senão o Nest casa 'me' como :id
  // e essa rota nunca é alcançada.
  @Patch('me/password')
  @ApiUpdateMyPassword()
  updateMyPassword(
    @CurrentUser() user: RequestUser,
    @Body() { password }: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.id, password);
  }

  @Patch(':id/password')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  @ApiUpdateUserPassword()
  updatePassword(
    @Param('id') id: string,
    @Body() { password }: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, password);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('delete', 'User'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRemoveUser()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @CheckPolicies((ability) => ability.can('update', 'User'))
  @ApiDeactivateUser()
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
