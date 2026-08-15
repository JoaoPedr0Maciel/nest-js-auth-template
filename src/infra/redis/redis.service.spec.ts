import { ConfigService } from '@nestjs/config';
import * as redisClientLib from 'redis';
import { z } from 'zod';
import { RedisService } from './redis.service';

function buildService(): {
  service: RedisService;
  client: Record<string, jest.Mock>;
} {
  const service = new RedisService({
    get: jest.fn(),
  } as unknown as ConfigService);

  const client = {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    flushAll: jest.fn(),
    lPush: jest.fn(),
    rPush: jest.fn(),
    lPop: jest.fn(),
    rPop: jest.fn(),
    lRange: jest.fn(),
    lLen: jest.fn(),
    sAdd: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn(),
    sIsMember: jest.fn(),
    hSet: jest.fn(),
    hGet: jest.fn(),
    hGetAll: jest.fn(),
    hDel: jest.fn(),
    hExists: jest.fn(),
    incr: jest.fn(),
    incrBy: jest.fn(),
    decr: jest.fn(),
    decrBy: jest.fn(),
  };

  (service as unknown as { client: typeof client }).client = client;

  return { service, client };
}

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

describe('RedisService.set', () => {
  it('usa setEx quando um ttl é informado', async () => {
    const { service, client } = buildService();

    await service.set('key', 'value', 60);

    expect(client.setEx).toHaveBeenCalledWith('key', 60, 'value');
    expect(client.set).not.toHaveBeenCalled();
  });

  it('usa set (sem expiração) quando nenhum ttl é informado', async () => {
    const { service, client } = buildService();

    await service.set('key', 'value');

    expect(client.set).toHaveBeenCalledWith('key', 'value');
  });

  it('serializa objetos com JSON.stringify antes de salvar', async () => {
    const { service, client } = buildService();

    await service.set('key', { id: '1' });

    expect(client.set).toHaveBeenCalledWith('key', JSON.stringify({ id: '1' }));
  });

  it('converte números para string antes de salvar', async () => {
    const { service, client } = buildService();

    await service.set('key', 42);

    expect(client.set).toHaveBeenCalledWith('key', '42');
  });
});

describe('RedisService — comandos básicos de chave', () => {
  it('get retorna o valor bruto do client', async () => {
    const { service, client } = buildService();
    client.get.mockResolvedValue('value');

    await expect(service.get('key')).resolves.toBe('value');
  });

  it('del delega pro client e retorna a contagem removida', async () => {
    const { service, client } = buildService();
    client.del.mockResolvedValue(1);

    await expect(service.del('key')).resolves.toBe(1);
    expect(client.del).toHaveBeenCalledWith('key');
  });

  it('exists converte o resultado numérico do client em boolean', async () => {
    const { service, client } = buildService();
    client.exists.mockResolvedValue(1);

    await expect(service.exists('key')).resolves.toBe(true);
  });

  it('exists retorna false quando a chave não existe', async () => {
    const { service, client } = buildService();
    client.exists.mockResolvedValue(0);

    await expect(service.exists('key')).resolves.toBe(false);
  });

  it('expire converte o resultado do client em boolean', async () => {
    const { service, client } = buildService();
    client.expire.mockResolvedValue(1);

    await expect(service.expire('key', 60)).resolves.toBe(true);
    expect(client.expire).toHaveBeenCalledWith('key', 60);
  });

  it('ttl repassa o valor retornado pelo client', async () => {
    const { service, client } = buildService();
    client.ttl.mockResolvedValue(120);

    await expect(service.ttl('key')).resolves.toBe(120);
  });

  it('keys repassa a lista de chaves retornada pelo client', async () => {
    const { service, client } = buildService();
    client.keys.mockResolvedValue(['a', 'b']);

    await expect(service.keys('*')).resolves.toEqual(['a', 'b']);
  });

  it('flushAll delega pro client', async () => {
    const { service, client } = buildService();

    await service.flushAll();

    expect(client.flushAll).toHaveBeenCalled();
  });
});

describe('RedisService — comandos de lista', () => {
  it('lpush repassa os valores pro client.lPush', async () => {
    const { service, client } = buildService();
    client.lPush.mockResolvedValue(2);

    await expect(service.lpush('key', 'a', 'b')).resolves.toBe(2);
    expect(client.lPush).toHaveBeenCalledWith('key', ['a', 'b']);
  });

  it('rpush repassa os valores pro client.rPush', async () => {
    const { service, client } = buildService();
    client.rPush.mockResolvedValue(2);

    await expect(service.rpush('key', 'a', 'b')).resolves.toBe(2);
    expect(client.rPush).toHaveBeenCalledWith('key', ['a', 'b']);
  });

  it('lpop delega pro client.lPop', async () => {
    const { service, client } = buildService();
    client.lPop.mockResolvedValue('a');

    await expect(service.lpop('key')).resolves.toBe('a');
  });

  it('rpop delega pro client.rPop', async () => {
    const { service, client } = buildService();
    client.rPop.mockResolvedValue('b');

    await expect(service.rpop('key')).resolves.toBe('b');
  });

  it('lrange delega pro client.lRange com o intervalo informado', async () => {
    const { service, client } = buildService();
    client.lRange.mockResolvedValue(['a', 'b']);

    await expect(service.lrange('key', 0, -1)).resolves.toEqual(['a', 'b']);
    expect(client.lRange).toHaveBeenCalledWith('key', 0, -1);
  });

  it('llen delega pro client.lLen', async () => {
    const { service, client } = buildService();
    client.lLen.mockResolvedValue(3);

    await expect(service.llen('key')).resolves.toBe(3);
  });
});

describe('RedisService — comandos de set', () => {
  it('sadd repassa os membros pro client.sAdd', async () => {
    const { service, client } = buildService();
    client.sAdd.mockResolvedValue(2);

    await expect(service.sadd('key', 'a', 'b')).resolves.toBe(2);
    expect(client.sAdd).toHaveBeenCalledWith('key', ['a', 'b']);
  });

  it('srem repassa os membros pro client.sRem', async () => {
    const { service, client } = buildService();
    client.sRem.mockResolvedValue(1);

    await expect(service.srem('key', 'a')).resolves.toBe(1);
    expect(client.sRem).toHaveBeenCalledWith('key', ['a']);
  });

  it('smembers delega pro client.sMembers', async () => {
    const { service, client } = buildService();
    client.sMembers.mockResolvedValue(['a', 'b']);

    await expect(service.smembers('key')).resolves.toEqual(['a', 'b']);
  });

  it('sismember converte o resultado numérico do client em boolean', async () => {
    const { service, client } = buildService();
    client.sIsMember.mockResolvedValue(1);

    await expect(service.sismember('key', 'a')).resolves.toBe(true);
  });
});

describe('RedisService — comandos de hash', () => {
  it('hset converte o valor pra string antes de salvar', async () => {
    const { service, client } = buildService();
    client.hSet.mockResolvedValue(1);

    await expect(service.hset('key', 'field', 42)).resolves.toBe(1);
    expect(client.hSet).toHaveBeenCalledWith('key', 'field', '42');
  });

  it('hget delega pro client.hGet', async () => {
    const { service, client } = buildService();
    client.hGet.mockResolvedValue('value');

    await expect(service.hget('key', 'field')).resolves.toBe('value');
  });

  it('hgetall delega pro client.hGetAll', async () => {
    const { service, client } = buildService();
    client.hGetAll.mockResolvedValue({ field: 'value' });

    await expect(service.hgetall('key')).resolves.toEqual({ field: 'value' });
  });

  it('hdel repassa os campos pro client.hDel', async () => {
    const { service, client } = buildService();
    client.hDel.mockResolvedValue(1);

    await expect(service.hdel('key', 'field')).resolves.toBe(1);
    expect(client.hDel).toHaveBeenCalledWith('key', ['field']);
  });

  it('hexists converte o resultado numérico do client em boolean', async () => {
    const { service, client } = buildService();
    client.hExists.mockResolvedValue(1);

    await expect(service.hexists('key', 'field')).resolves.toBe(true);
  });
});

describe('RedisService — contadores', () => {
  it('incr delega pro client.incr', async () => {
    const { service, client } = buildService();
    client.incr.mockResolvedValue(1);

    await expect(service.incr('key')).resolves.toBe(1);
  });

  it('incrby delega pro client.incrBy', async () => {
    const { service, client } = buildService();
    client.incrBy.mockResolvedValue(5);

    await expect(service.incrby('key', 5)).resolves.toBe(5);
    expect(client.incrBy).toHaveBeenCalledWith('key', 5);
  });

  it('decr delega pro client.decr', async () => {
    const { service, client } = buildService();
    client.decr.mockResolvedValue(-1);

    await expect(service.decr('key')).resolves.toBe(-1);
  });

  it('decrby delega pro client.decrBy', async () => {
    const { service, client } = buildService();
    client.decrBy.mockResolvedValue(-5);

    await expect(service.decrby('key', 5)).resolves.toBe(-5);
    expect(client.decrBy).toHaveBeenCalledWith('key', 5);
  });
});

describe('RedisService.getClient', () => {
  it('retorna a instância do client armazenada internamente', () => {
    const { service, client } = buildService();

    expect(service.getClient()).toBe(client);
  });
});

describe('RedisService — ciclo de vida', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('onModuleInit conecta no Redis usando a REDIS_URL configurada', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const fakeClient = { connect, disconnect: jest.fn(), on: jest.fn() };
    jest
      .spyOn(redisClientLib, 'createClient')
      .mockReturnValue(
        fakeClient as unknown as ReturnType<typeof redisClientLib.createClient>,
      );

    const service = new RedisService({
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    } as unknown as ConfigService);

    await service.onModuleInit();

    expect(redisClientLib.createClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(connect).toHaveBeenCalled();
  });

  it('onModuleInit não lança quando a conexão falha (só loga o erro)', async () => {
    const fakeClient = {
      connect: jest.fn().mockRejectedValue(new Error('connection refused')),
      disconnect: jest.fn(),
      on: jest.fn(),
    };
    jest
      .spyOn(redisClientLib, 'createClient')
      .mockReturnValue(
        fakeClient as unknown as ReturnType<typeof redisClientLib.createClient>,
      );

    const service = new RedisService({
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    } as unknown as ConfigService);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('onModuleDestroy desconecta o client quando ele existe', async () => {
    const { service, client } = buildService();
    const disconnect = jest.fn();
    (service as unknown as { client: { disconnect: jest.Mock } }).client = {
      ...client,
      disconnect,
    };

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
  });

  it('onModuleDestroy não quebra quando o client nunca foi inicializado', async () => {
    const service = new RedisService({
      get: jest.fn(),
    } as unknown as ConfigService);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
