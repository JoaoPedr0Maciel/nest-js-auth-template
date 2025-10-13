import { Role } from '@prisma/client';

export interface JwtPayload {
  phone: string;
  sub: string;
  role: Role;
  name: string;
}

export interface RequestUser {
  id: string;
  phone: string;
  name: string;
  role: Role;
  isActive: boolean;
}
