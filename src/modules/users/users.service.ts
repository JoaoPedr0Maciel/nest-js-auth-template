import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizePhone } from '../../common/utils/phone.util';
import {
  getPagination,
  PaginationResponse,
  paginationQuery,
} from '../../common/pagination';
import { Errors } from './errors';
import { buildUsersWhere, UserQueryDto } from './filters';
import { userCacheSchema } from './schemas/user-cache.schema';

const USER_CACHE_TTL_SECONDS = 300;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private userCacheKey(id: string): string {
    return `user:${id}`;
  }

  async findAll(filter: UserQueryDto): Promise<
    PaginationResponse<{
      id: string;
      email: string;
      phone: string;
      name: string;
      role: Role;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const { skip, take } = paginationQuery(filter);
    const where = buildUsersWhere(filter);

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: getPagination({
        page: filter.page ? Number(filter.page) : undefined,
        limit: filter.limit ? Number(filter.limit) : undefined,
        count,
      }),
    };
  }

  async findOne(id: string) {
    const cached = await this.redis.getObject(
      this.userCacheKey(id),
      userCacheSchema,
    );
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw Errors.notFound();
    }

    await this.redis.set(this.userCacheKey(id), user, USER_CACHE_TTL_SECONDS);

    return user;
  }

  async create(data: {
    email: string;
    phone: string;
    password: string;
    name: string;
    role?: Role;
  }) {
    const normalizedPhone = normalizePhone(data.phone);

    const [existingEmail, existingPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: data.email } }),
      this.prisma.user.findUnique({ where: { phone: normalizedPhone } }),
    ]);

    if (existingEmail) {
      throw Errors.emailAlreadyExists();
    }

    if (existingPhone) {
      throw Errors.phoneAlreadyExists();
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        phone: normalizedPhone,
        password: hashedPassword,
        name: data.name,
        role: data.role || Role.USER,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      email: string;
      phone: string;
      name: string;
      role: Role;
      isActive: boolean;
    }>,
  ) {
    const user = await this.findOne(id);

    const updateData = { ...data };

    if (data.phone && data.phone !== user.phone) {
      const normalizedPhone = normalizePhone(data.phone);

      const existingUser = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        throw Errors.phoneAlreadyExists();
      }

      updateData.phone = normalizedPhone;
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw Errors.emailAlreadyExists();
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.redis.del(this.userCacheKey(id));

    return updated;
  }

  async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const removed = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
      },
    });

    await this.redis.del(this.userCacheKey(id));

    return removed;
  }

  async deactivate(id: string) {
    await this.findOne(id);

    const deactivated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        isActive: true,
      },
    });

    await this.redis.del(this.userCacheKey(id));

    return deactivated;
  }
}
