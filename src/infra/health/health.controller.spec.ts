import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface FakeCheckResult {
  results: Array<Record<string, { status: string; message?: string }>>;
}

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let healthIndicatorService: { check: jest.Mock };
  let prisma: { $queryRaw: jest.Mock };
  let redis: { getClient: jest.Mock };

  beforeEach(() => {
    health = {
      // executa os indicadores recebidos, como o HealthCheckService real faria
      check: jest.fn(async (indicators: Array<() => Promise<unknown>>) => ({
        status: 'ok',
        results: await Promise.all(indicators.map((indicator) => indicator())),
      })),
    };
    healthIndicatorService = {
      check: jest.fn((key: string) => ({
        up: () => ({ [key]: { status: 'up' } }),
        down: (data: { message: string }) => ({
          [key]: { status: 'down', ...data },
        }),
      })),
    };
    prisma = { $queryRaw: jest.fn() };
    redis = { getClient: jest.fn() };

    controller = new HealthController(
      health as unknown as HealthCheckService,
      healthIndicatorService as HealthIndicatorService,
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('reporta o banco e o redis como "up" quando ambos respondem', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const ping = jest.fn().mockResolvedValue('PONG');
    redis.getClient.mockReturnValue({ ping });

    const result = (await controller.check()) as unknown as FakeCheckResult;

    expect(result.results).toEqual([
      { database: { status: 'up' } },
      { redis: { status: 'up' } },
    ]);
  });

  it('reporta o banco como "down" quando a query falha', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const ping = jest.fn().mockResolvedValue('PONG');
    redis.getClient.mockReturnValue({ ping });

    const result = (await controller.check()) as unknown as FakeCheckResult;

    expect(result.results[0]).toEqual({
      database: { status: 'down', message: 'connection refused' },
    });
  });

  it('reporta o redis como "down" quando o ping falha', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const ping = jest.fn().mockRejectedValue(new Error('redis unreachable'));
    redis.getClient.mockReturnValue({ ping });

    const result = (await controller.check()) as unknown as FakeCheckResult;

    expect(result.results[1]).toEqual({
      redis: { status: 'down', message: 'redis unreachable' },
    });
  });
});
