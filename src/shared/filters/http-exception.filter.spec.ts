import {
  ArgumentsHost,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/users/1' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('usa o status da exception e repassa message/code quando o body é um objeto', () => {
    filter.catch(
      new ConflictException({
        message: 'Já existe um usuário com este e-mail',
        code: 'USER_EMAIL_ALREADY_EXISTS',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'USER_EMAIL_ALREADY_EXISTS',
        message: 'Já existe um usuário com este e-mail',
        path: '/users/1',
      }),
    );
  });

  it('usa o body string como mensagem, sem code', () => {
    filter.catch(new ConflictException('conflict'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'conflict', code: undefined }),
    );
  });

  it('substitui a message por uma mensagem genérica em PT-BR quando o status é 403, mesmo com body customizado', () => {
    filter.catch(new ForbiddenException('Forbidden resource'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Acesso não autorizado',
      }),
    );
  });

  it('trata exceptions desconhecidas (não-Http) como 500 com mensagem genérica', () => {
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: undefined,
        message: 'Internal server error',
      }),
    );
  });

  it('inclui um timestamp ISO', () => {
    filter.catch(new Error('boom'), host);

    const [body] = json.mock.calls[0] as [{ timestamp: string }];
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
