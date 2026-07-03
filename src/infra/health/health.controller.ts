import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  HealthCheck,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthIndicatorService: HealthIndicatorService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verifica a saúde da aplicação, banco e cache' })
  check() {
    return this.health.check([
      async () => {
        const indicator = this.healthIndicatorService.check('database');
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return indicator.up();
        } catch (error) {
          return indicator.down({ message: (error as Error).message });
        }
      },
      async () => {
        const indicator = this.healthIndicatorService.check('redis');
        try {
          await this.redis.getClient().ping();
          return indicator.up();
        } catch (error) {
          return indicator.down({ message: (error as Error).message });
        }
      },
    ]);
  }
}
