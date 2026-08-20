import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

interface FakeCheckResult {
  results: Array<Record<string, { status: string; message?: string }>>;
}

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let healthIndicatorService: { check: jest.Mock };
  let prisma: { $queryRaw: jest.Mock };

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

    controller = new HealthController(
      health as unknown as HealthCheckService,
      healthIndicatorService as HealthIndicatorService,
      prisma as unknown as PrismaService,
    );
  });

  it('reporta o banco como "up" quando responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = (await controller.check()) as unknown as FakeCheckResult;

    expect(result.results).toEqual([{ database: { status: 'up' } }]);
  });

  it('reporta o banco como "down" quando a query falha', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = (await controller.check()) as unknown as FakeCheckResult;

    expect(result.results[0]).toEqual({
      database: { status: 'down', message: 'connection refused' },
    });
  });
});
