import { AppErrors } from '../../../common/errors/app-errors';

/** Catálogo de erros do módulo Auth (não ligados a um recurso específico). */
export const authErrors = {
  invalidRefreshToken: () =>
    AppErrors.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN'),
};
