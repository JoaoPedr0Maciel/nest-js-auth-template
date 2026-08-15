import { UnauthorizedException } from '@nestjs/common';

export const Errors = {
  invalidRefreshToken: () =>
    new UnauthorizedException({
      message: 'Refresh token inválido',
      code: 'INVALID_REFRESH_TOKEN',
    }),

  twoFactorChallengeExpired: () =>
    new UnauthorizedException({
      message:
        'Desafio de autenticação em dois fatores expirado ou inválido, faça login novamente',
      code: 'TWO_FACTOR_CHALLENGE_EXPIRED',
    }),

  twoFactorTooManyAttempts: () =>
    new UnauthorizedException({
      message:
        'Muitas tentativas inválidas de autenticação em dois fatores, faça login novamente',
      code: 'TWO_FACTOR_TOO_MANY_ATTEMPTS',
    }),
};
