import { z } from 'zod';

/**
 * Shape do usuário como ele é lido de volta do cache no Redis.
 *
 * O `JSON.stringify`/`JSON.parse` do RedisService transforma `Date` em
 * string ISO — `z.coerce.date()` reconstrói o `Date` a partir dela e
 * ainda rejeita qualquer valor que não seja uma data válida. Se o shape
 * do `User` do Prisma mudar (campo removido/renomeado) sem invalidar o
 * cache, uma entrada antiga cai na validação em vez de vazar campos
 * fantasmas pro resto da aplicação.
 */
export const userCacheSchema = z.object({
  id: z.string(),
  email: z.string(),
  phone: z.string(),
  name: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CachedUser = z.infer<typeof userCacheSchema>;
