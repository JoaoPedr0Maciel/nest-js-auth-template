import { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: Role;
  isActive: boolean;
}

/**
 * Campos mínimos pra emitir um par de tokens (ver `issueTokens` em
 * AuthService). Derivado de RequestUser em vez de repetir os campos
 * pra não desalinhar se um dia um dos dois mudar.
 */
export type TokenSubject = Pick<
  RequestUser,
  'id' | 'name' | 'email' | 'phone' | 'role'
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express's Request type
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
