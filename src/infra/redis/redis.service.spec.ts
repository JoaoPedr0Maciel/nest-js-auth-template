import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { RedisService } from './redis.service';

describe('RedisService.getObject', () => {
  let service: RedisService;
  let get: jest.Mock;

  const schema = z.object({
    id: z.string(),
    name: z.string(),
  });

  beforeEach(() => {
    service = new RedisService({ get: jest.fn() } as unknown as ConfigService);
    get = jest.fn();
    (service as unknown as { client: { get: jest.Mock } }).client = { get };
  });

  it('retorna o objeto quando bate com o schema', async () => {
    get.mockResolvedValue(JSON.stringify({ id: '1', name: 'joao' }));

    const result = await service.getObject('user:1', schema);

    expect(result).toEqual({ id: '1', name: 'joao' });
  });

  it('retorna null quando a chave não existe', async () => {
    get.mockResolvedValue(null);

    const result = await service.getObject('user:404', schema);

    expect(result).toBeNull();
  });

  it('retorna null quando o valor não é um JSON válido', async () => {
    get.mockResolvedValue('isso nao e json {{{');

    const result = await service.getObject('user:1', schema);

    expect(result).toBeNull();
  });

  it('retorna null quando o JSON não bate com o schema esperado', async () => {
    // formato antigo: sem "name", campo que o schema atual exige
    get.mockResolvedValue(JSON.stringify({ id: '1' }));

    const result = await service.getObject('user:1', schema);

    expect(result).toBeNull();
  });
});
