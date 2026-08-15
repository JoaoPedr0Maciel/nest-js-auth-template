import { BadRequestException, ConflictException } from '@nestjs/common';

export const Errors = {
  alreadyEnabled: () =>
    new ConflictException({
      message: 'A autenticação em dois fatores já está ativada nesta conta',
      code: 'TWO_FACTOR_ALREADY_ENABLED',
    }),

  notEnabled: () =>
    new BadRequestException({
      message: 'A autenticação em dois fatores não está ativada nesta conta',
      code: 'TWO_FACTOR_NOT_ENABLED',
    }),

  setupNotFound: () =>
    new BadRequestException({
      message:
        'Nenhuma configuração de 2FA pendente foi encontrada, ou ela expirou. Inicie a configuração novamente',
      code: 'TWO_FACTOR_SETUP_NOT_FOUND',
    }),

  invalidCode: () =>
    new BadRequestException({
      message: 'Código de autenticação inválido',
      code: 'TWO_FACTOR_INVALID_CODE',
    }),

  invalidRecoveryCode: () =>
    new BadRequestException({
      message: 'Código de recuperação inválido ou já utilizado',
      code: 'TWO_FACTOR_INVALID_RECOVERY_CODE',
    }),
};
