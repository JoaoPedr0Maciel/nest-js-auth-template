import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizePhone } from '../../common/utils/phone.util';
import {
  getPagination,
  Pagination,
  PaginationResponse,
  paginationQuery,
} from '../../common/pagination';
import { userErrors } from './errors';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: Pagination): Promise<
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
    const { skip, take } = paginationQuery(pagination);

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
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
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: getPagination({
        page: pagination.page ? Number(pagination.page) : undefined,
        limit: pagination.limit ? Number(pagination.limit) : undefined,
        count,
      }),
    };
  }

  async findOne(id: string) {
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
      throw userErrors.notFound();
    }

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
      throw userErrors.emailAlreadyExists();
    }

    if (existingPhone) {
      throw userErrors.phoneAlreadyExists();
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
        throw userErrors.phoneAlreadyExists();
      }

      updateData.phone = normalizedPhone;
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw userErrors.emailAlreadyExists();
      }
    }

    return this.prisma.user.update({
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

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
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
  }
}
