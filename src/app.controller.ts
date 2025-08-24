import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { Roles } from './auth/decorators/roles.decorator';
import { RolesGuard } from './auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected')
  getProtected(@CurrentUser() user: any) {
    return {
      message: 'This is a protected route',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MASTER)
  @Get('admin')
  getAdminRoute(@CurrentUser() user: any) {
    return {
      message: 'This route requires ADMIN or MASTER role',
      user: user,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MASTER)
  @Get('master')
  getMasterRoute(@CurrentUser() user: any) {
    return {
      message: 'This route requires MASTER role only',
      user: user,
    };
  }
}
