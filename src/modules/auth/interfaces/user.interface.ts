import { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: Role;
  isActive: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express's Request type
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
