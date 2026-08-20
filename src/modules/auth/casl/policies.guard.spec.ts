import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PoliciesGuard } from './policies.guard';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let caslAbilityFactory: { createForUser: jest.Mock };

  const buildContext = (user?: { role: Role }): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    caslAbilityFactory = { createForUser: jest.fn() };
    guard = new PoliciesGuard(
      reflector as unknown as Reflector,
      caslAbilityFactory,
    );
  });

  it('permite acesso quando a rota não exige policies', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext({ role: Role.USER }))).toBe(true);
    expect(caslAbilityFactory.createForUser).not.toHaveBeenCalled();
  });

  it('permite acesso quando todos os handlers retornam true', () => {
    const ability = {};
    reflector.getAllAndOverride.mockReturnValue([() => true, () => true]);
    caslAbilityFactory.createForUser.mockReturnValue(ability);

    expect(guard.canActivate(buildContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('nega acesso quando algum handler retorna false', () => {
    reflector.getAllAndOverride.mockReturnValue([() => true, () => false]);
    caslAbilityFactory.createForUser.mockReturnValue({});

    expect(guard.canActivate(buildContext({ role: Role.USER }))).toBe(false);
  });

  it('nega acesso quando não há usuário na request', () => {
    reflector.getAllAndOverride.mockReturnValue([() => true]);

    expect(guard.canActivate(buildContext(undefined))).toBe(false);
    expect(caslAbilityFactory.createForUser).not.toHaveBeenCalled();
  });
});
