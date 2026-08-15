import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService({
      get: jest
        .fn()
        .mockReturnValue('postgresql://user:pass@localhost:5432/db'),
    } as unknown as ConfigService);
  });

  it('onModuleInit conecta no banco', async () => {
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalled();
  });

  it('onModuleDestroy desconecta do banco', async () => {
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
  });
});
