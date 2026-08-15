import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequestUser } from './interfaces/user.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<
    'login' | 'register' | 'refresh' | 'logout' | 'getProfile',
    jest.Mock
  >;

  const currentUser: RequestUser = {
    id: 'user-1',
    email: 'joao@example.com',
    phone: '+5511999999999',
    name: 'João',
    role: Role.USER,
    isActive: true,
  };

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  it('login delega pra AuthService.login com o DTO', async () => {
    const dto = { email: 'joao@example.com', password: '123456' };
    authService.login.mockResolvedValue('login-result');

    await expect(controller.login(dto)).resolves.toBe('login-result');
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('register delega pra AuthService.register com o DTO', async () => {
    const dto = {
      email: 'joao@example.com',
      phone: '+5511999999999',
      password: '123456',
      name: 'João',
    };
    authService.register.mockResolvedValue('register-result');

    await expect(controller.register(dto)).resolves.toBe('register-result');
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('refresh delega pra AuthService.refresh com a string do token', async () => {
    authService.refresh.mockResolvedValue('refresh-result');

    await expect(
      controller.refresh({ refreshToken: 'abc-token' }),
    ).resolves.toBe('refresh-result');
    expect(authService.refresh).toHaveBeenCalledWith('abc-token');
  });

  it('logout delega pra AuthService.logout com o id do usuário atual', async () => {
    await controller.logout(currentUser);

    expect(authService.logout).toHaveBeenCalledWith(currentUser.id);
  });

  it('getProfile delega pra AuthService.getProfile com o id do usuário atual', async () => {
    authService.getProfile.mockResolvedValue('profile-result');

    await expect(controller.getProfile(currentUser)).resolves.toBe(
      'profile-result',
    );
    expect(authService.getProfile).toHaveBeenCalledWith(currentUser.id);
  });
});
