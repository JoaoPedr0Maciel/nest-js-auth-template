import { AbilityBuilder } from '@casl/ability';
import { Role } from '@prisma/client';
import { RequestUser } from '../interfaces/user.interface';
import { AppAbility } from './ability.type';

type PermissionsByRole = (
  user: RequestUser,
  builder: AbilityBuilder<AppAbility>,
) => void;

export const permissions: Record<Role, PermissionsByRole> = {
  ADMIN(_user, { can }) {
    can('manage', 'all');
  },
  USER() {
    // Nenhuma permissão sobre User — o único acesso self-service
    // (PATCH /users/me/password) opera direto em cima do id do token,
    // sem passar por checagem de policy.
  },
};
