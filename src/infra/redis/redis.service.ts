import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { z } from 'zod';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );

    this.client = createClient({
      url: redisUrl,
    }) as RedisClientType;

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis Client Ready');
    });

    try {
      await this.client.connect();
      this.logger.log('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Redis Client Disconnected');
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // Métodos básicos de conveniência
  async set(
    key: string,
    value: string | number | object,
    ttl?: number,
  ): Promise<void> {
    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (ttl) {
      await this.client.setEx(key, ttl, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async get(key: string): Promise<string | null> {
    return (await this.client.get(key)) as string | null;
  }

  /**
   * Lê e valida um objeto salvo no Redis contra um schema Zod.
   *
   * O Redis guarda só texto — o que volta em `JSON.parse` é `unknown`,
   * não o `T` que o chamador espera. Um `as T` aqui mentiria pro
   * compilador: nada garante que o valor salvo ainda bate com o shape
   * atual do código (ex. deploy anterior gravou um formato diferente,
   * TTL vencido de forma inconsistente, chave usada por outro serviço).
   * `schema.parse` valida isso em runtime, no lugar onde o dado
   * realmente entra na aplicação.
   */
  async getObject<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const value = (await this.client.get(key)) as string | null;
    if (!value) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      this.logger.warn(`Valor em "${key}" não é um JSON válido`);
      return null;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      this.logger.warn(
        `Valor em "${key}" não bate com o schema esperado: ${result.error.message}`,
      );
      return null;
    }

    return result.data;
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async flushAll(): Promise<void> {
    await this.client.flushAll();
  }

  // Métodos para listas
  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.lPush(key, values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.rPush(key, values);
  }

  async lpop(key: string): Promise<string | null> {
    return (await this.client.lPop(key)) as string | null;
  }

  async rpop(key: string): Promise<string | null> {
    return (await this.client.rPop(key)) as string | null;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return await this.client.lLen(key);
  }

  // Métodos para sets
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sAdd(key, members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.client.sRem(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sIsMember(key, member);
    return result === 1;
  }

  // Métodos para hash
  async hset(
    key: string,
    field: string,
    value: string | number,
  ): Promise<number> {
    return await this.client.hSet(key, field, String(value));
  }

  async hget(key: string, field: string): Promise<string | null> {
    return (await this.client.hGet(key, field)) as string | null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hDel(key, fields);
  }

  async hexists(key: string, field: string): Promise<boolean> {
    const result = await this.client.hExists(key, field);
    return result === 1;
  }

  // Método para incrementar contadores
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return await this.client.incrBy(key, increment);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async decrby(key: string, decrement: number): Promise<number> {
    return await this.client.decrBy(key, decrement);
  }
}
