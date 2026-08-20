import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface RefreshTokenPayload {
  id: string;
  tokenId: string;
}
