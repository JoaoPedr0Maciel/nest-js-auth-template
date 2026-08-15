import { Role } from '@prisma/client';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { RequestUser } from '../auth/interfaces/user.interface';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let twoFactorService: Record<
    | 'setup'
    | 'confirmSetup'
    | 'disable'
    | 'regenerateRecoveryCodes'
    | 'verifyChallenge'
    | 'verifyRecoveryChallenge',
    jest.Mock
  >;

  const user: RequestUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    isActive: true,
  };

  beforeEach(() => {
    twoFactorService = {
      setup: jest.fn(),
      confirmSetup: jest.fn(),
      disable: jest.fn(),
      regenerateRecoveryCodes: jest.fn(),
      verifyChallenge: jest.fn(),
      verifyRecoveryChallenge: jest.fn(),
    };

    controller = new TwoFactorController(
      twoFactorService as unknown as TwoFactorService,
    );
  });

  it('setup delega pra TwoFactorService.setup com o id do usuário atual', () => {
    twoFactorService.setup.mockReturnValue('setup-result');

    expect(controller.setup(user)).toBe('setup-result');
    expect(twoFactorService.setup).toHaveBeenCalledWith(user.id);
  });

  it('confirmSetup delega pra TwoFactorService.confirmSetup com id e DTO', () => {
    const dto = { code: '123456' };
    twoFactorService.confirmSetup.mockReturnValue('confirm-result');

    expect(controller.confirmSetup(user, dto)).toBe('confirm-result');
    expect(twoFactorService.confirmSetup).toHaveBeenCalledWith(user.id, dto);
  });

  it('disable delega pra TwoFactorService.disable com id e DTO', async () => {
    const dto = { password: 'senha123', code: '123456' };
    twoFactorService.disable.mockResolvedValue(undefined);

    await controller.disable(user, dto);

    expect(twoFactorService.disable).toHaveBeenCalledWith(user.id, dto);
  });

  it('regenerateRecoveryCodes delega pra TwoFactorService.regenerateRecoveryCodes com id e DTO', () => {
    const dto = { password: 'senha123', code: '123456' };
    twoFactorService.regenerateRecoveryCodes.mockReturnValue(
      'regenerate-result',
    );

    expect(controller.regenerateRecoveryCodes(user, dto)).toBe(
      'regenerate-result',
    );
    expect(twoFactorService.regenerateRecoveryCodes).toHaveBeenCalledWith(
      user.id,
      dto,
    );
  });

  it('verify delega pra TwoFactorService.verifyChallenge com o DTO', () => {
    const dto = { challengeToken: 'token-1', code: '123456' };
    twoFactorService.verifyChallenge.mockReturnValue('verify-result');

    expect(controller.verify(dto)).toBe('verify-result');
    expect(twoFactorService.verifyChallenge).toHaveBeenCalledWith(dto);
  });

  it('verifyRecovery delega pra TwoFactorService.verifyRecoveryChallenge com o DTO', () => {
    const dto = { challengeToken: 'token-1', recoveryCode: 'AAAA-AAAA' };
    twoFactorService.verifyRecoveryChallenge.mockReturnValue(
      'verify-recovery-result',
    );

    expect(controller.verifyRecovery(dto)).toBe('verify-recovery-result');
    expect(twoFactorService.verifyRecoveryChallenge).toHaveBeenCalledWith(dto);
  });
});
