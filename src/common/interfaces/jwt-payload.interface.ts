import { Role } from "@prisma/client";

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
}