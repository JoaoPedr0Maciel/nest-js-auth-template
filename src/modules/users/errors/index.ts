import { AppErrors } from '../../../common/errors/app-errors';

const RESOURCE = 'User' as const;

/**
 * Catálogo de erros do módulo User. Fixa o nome do recurso uma única vez e
 * reaproveita as fábricas genéricas de `AppErrors` — sem duplicar mensagens
 * nem depender de um enum central de recursos.
 */
export const userErrors = {
  notFound: () => AppErrors.notFound(RESOURCE),
  emailAlreadyExists: () => AppErrors.alreadyExists(RESOURCE, 'email'),
  phoneAlreadyExists: () => AppErrors.alreadyExists(RESOURCE, 'phone'),
  invalidPassword: () => AppErrors.invalid('password'),
};
