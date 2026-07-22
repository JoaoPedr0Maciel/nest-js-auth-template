import { UnauthorizedException } from '@nestjs/common';

export const Errors = {
  invalidRefreshToken: () =>
    new UnauthorizedException({
      message: 'Refresh token inválido',
      code: 'INVALID_REFRESH_TOKEN',
    }),
};
