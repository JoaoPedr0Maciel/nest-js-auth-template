import { Role } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RequestUser } from '../auth/interfaces/user.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<
    | 'findAll'
    | 'findOne'
    | 'create'
    | 'update'
    | 'updatePassword'
    | 'remove'
    | 'deactivate',
    jest.Mock
  >;

  const admin: RequestUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    phone: '+5511999999999',
    name: 'Admin',
    role: Role.ADMIN,
    isActive: true,
  };

  beforeEach(() => {
    usersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      remove: jest.fn(),
      deactivate: jest.fn(),
    };

    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('findAll delega pra UsersService.findAll com o filtro da query', () => {
    const filter = { page: '1', limit: '15' };
    usersService.findAll.mockReturnValue('list-result');

    expect(controller.findAll(filter)).toBe('list-result');
    expect(usersService.findAll).toHaveBeenCalledWith(filter);
  });

  it('findOne delega pra UsersService.findOne com o id do param', () => {
    usersService.findOne.mockReturnValue('user-result');

    expect(controller.findOne('user-1')).toBe('user-result');
    expect(usersService.findOne).toHaveBeenCalledWith('user-1');
  });

  it('create delega pra UsersService.create com o DTO', () => {
    const dto = {
      email: 'new@example.com',
      phone: '+5511988888888',
      password: '123456',
      name: 'Novo',
    };
    usersService.create.mockReturnValue('create-result');

    expect(controller.create(dto)).toBe('create-result');
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('update delega pra UsersService.update com id e DTO', () => {
    const dto = { name: 'Atualizado' };
    usersService.update.mockReturnValue('update-result');

    expect(controller.update('user-1', dto)).toBe('update-result');
    expect(usersService.update).toHaveBeenCalledWith('user-1', dto);
  });

  it('updatePassword (rota de admin) delega com o id alvo', () => {
    usersService.updatePassword.mockReturnValue('password-result');

    expect(
      controller.updatePassword('user-1', { password: 'new-password' }),
    ).toBe('password-result');
    expect(usersService.updatePassword).toHaveBeenCalledWith(
      'user-1',
      'new-password',
    );
  });

  it('updateMyPassword delega usando o id do usuário autenticado, não um param', () => {
    usersService.updatePassword.mockReturnValue('password-result');

    expect(
      controller.updateMyPassword(admin, { password: 'new-password' }),
    ).toBe('password-result');
    expect(usersService.updatePassword).toHaveBeenCalledWith(
      admin.id,
      'new-password',
    );
  });

  it('remove delega pra UsersService.remove com o id do param', () => {
    usersService.remove.mockReturnValue('remove-result');

    expect(controller.remove('user-1')).toBe('remove-result');
    expect(usersService.remove).toHaveBeenCalledWith('user-1');
  });

  it('deactivate delega pra UsersService.deactivate com o id do param', () => {
    usersService.deactivate.mockReturnValue('deactivate-result');

    expect(controller.deactivate('user-1')).toBe('deactivate-result');
    expect(usersService.deactivate).toHaveBeenCalledWith('user-1');
  });
});
