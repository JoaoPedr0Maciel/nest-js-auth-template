import { Role } from '@prisma/client';
export interface RequestUser {
  id: string;
  phone: string;
  name: string;
  role: Role;
  isActive: boolean;
}
