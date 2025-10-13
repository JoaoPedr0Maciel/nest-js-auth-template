import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PhoneValidationUtil } from '../../common/utils/phone-validation.util';
import { errors } from 'src/utils/errors.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw errors.user.not_found;
    }

    return user;
  }

  async create(data: {
    phone: string;
    password: string;
    name: string;
    role?: Role;
  }) {
    const normalizedPhone = PhoneValidationUtil.normalizePhone(data.phone);
    
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        phone: normalizedPhone,
        password: hashedPassword,
        name: data.name,
        role: data.role || Role.USER,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: Partial<{
    phone: string;
    name: string;
    role: Role;
    isActive: boolean;
  }>) {
    const user = await this.findOne(id);

    let updateData = { ...data };

    if (data.phone && data.phone !== user.phone) {
      const normalizedPhone = PhoneValidationUtil.normalizePhone(data.phone);
      
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        throw new ConflictException('Phone number already in use');
      }
      
      updateData.phone = normalizedPhone;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
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
        phone: true,
        name: true,
        isActive: true,
      },
    });
  }
}
