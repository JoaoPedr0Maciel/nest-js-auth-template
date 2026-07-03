import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

const toCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Fábricas de exceção genéricas e reutilizáveis por qualquer módulo.
 * Cada chamada cria uma instância nova (nunca reaproveite a mesma exceção entre requests)
 * e inclui um `code` machine-readable no corpo da resposta, além da `message` humana.
 *
 * Cada módulo deve fixar seu próprio nome de recurso uma única vez (ex. um
 * `RESOURCE = 'User' as const` em `users.errors.ts`) e reaproveitar essas fábricas
 * a partir dali — veja `src/modules/users/users.errors.ts`.
 */
export const AppErrors = {
  notFound: (resource: string, detail?: string): NotFoundException => {
    const message = detail
      ? `${resource} not found: ${detail}`
      : `${resource} not found`;
    return new NotFoundException({
      message,
      code: `${toCode(resource)}_NOT_FOUND`,
    });
  },

  alreadyExists: (resource: string, field: string): ConflictException => {
    const message = `${resource} with this ${field} already exists`;
    return new ConflictException({
      message,
      code: `${toCode(resource)}_${toCode(field)}_ALREADY_EXISTS`,
    });
  },

  invalid: (subject: string, reason?: string): BadRequestException => {
    const message = reason
      ? `Invalid ${subject}: ${reason}`
      : `Invalid ${subject}`;
    return new BadRequestException({
      message,
      code: `INVALID_${toCode(subject)}`,
    });
  },

  unauthorized: (
    message = 'Invalid credentials',
    code = 'UNAUTHORIZED',
  ): UnauthorizedException => new UnauthorizedException({ message, code }),

  forbidden: (
    message = 'Forbidden resource',
    code = 'FORBIDDEN',
  ): ForbiddenException => new ForbiddenException({ message, code }),
};
