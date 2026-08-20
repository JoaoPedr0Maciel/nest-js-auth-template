import { Role } from '@prisma/client';
import { CaslAbilityFactory } from './casl-ability.factory';
import { RequestUser } from '../interfaces/user.interface';

describe('CaslAbilityFactory', () => {
  const factory = new CaslAbilityFactory();

  const buildUser = (role: Role): RequestUser => ({
    id: 'user-1',
    email: 'user@example.com',
    phone: '+5511999999999',
    name: 'Usuário',
    role,
    isActive: true,
  });

  it('ADMIN consegue qualquer ação sobre User', () => {
    const ability = factory.createForUser(buildUser(Role.ADMIN));

    expect(ability.can('manage', 'User')).toBe(true);
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('create', 'User')).toBe(true);
    expect(ability.can('update', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(true);
  });

  it('USER não tem nenhuma permissão sobre User', () => {
    const ability = factory.createForUser(buildUser(Role.USER));

    expect(ability.can('read', 'User')).toBe(false);
    expect(ability.can('create', 'User')).toBe(false);
    expect(ability.can('update', 'User')).toBe(false);
    expect(ability.can('delete', 'User')).toBe(false);
  });
});
