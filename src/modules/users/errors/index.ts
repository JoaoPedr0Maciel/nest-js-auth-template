import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export const Errors = {
  notFound: () =>
    new NotFoundException({
      message: 'Usuário não encontrado',
      code: 'USER_NOT_FOUND',
    }),

  emailAlreadyExists: () =>
    new ConflictException({
      message: 'Já existe um usuário com este e-mail',
      code: 'USER_EMAIL_ALREADY_EXISTS',
    }),

  phoneAlreadyExists: () =>
    new ConflictException({
      message: 'Já existe um usuário com este telefone',
      code: 'USER_PHONE_ALREADY_EXISTS',
    }),

  invalidPassword: () =>
    new BadRequestException({
      message: 'Senha inválida',
      code: 'INVALID_PASSWORD',
    }),
};
