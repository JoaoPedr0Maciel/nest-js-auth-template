import { Prisma } from '@prisma/client';
import { UserQueryDto } from './user-query.dto';

export * from './user-query.dto';

export function buildUsersWhere({
  email,
  phone,
}: UserQueryDto): Prisma.UserWhereInput {
  return {
    ...(email && { email: { contains: email, mode: 'insensitive' } }),
    ...(phone && { phone: { contains: phone } }),
  };
}
