import { validateEnv } from './env.validation';

const validConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(16),
  JWT_REFRESH_SECRET: 'b'.repeat(16),
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnv', () => {
  it('faz parse de uma config válida e aplica os defaults documentados', () => {
    const result = validateEnv(validConfig);

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_EXPIRES_IN: '24h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: '*',
    });
  });

  it('converte PORT para número', () => {
    const result = validateEnv({ ...validConfig, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });

  it('lança erro quando falta uma variável obrigatória', () => {
    const { DATABASE_URL: _drop, ...rest } = validConfig;
    void _drop;

    expect(() => validateEnv(rest)).toThrow(/Variáveis de ambiente inválidas/);
  });

  it('lança erro quando JWT_SECRET tem menos de 16 caracteres', () => {
    expect(() => validateEnv({ ...validConfig, JWT_SECRET: 'short' })).toThrow(
      /Variáveis de ambiente inválidas/,
    );
  });

  it('lança erro quando DATABASE_URL não é uma URL válida', () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: 'not-a-url' }),
    ).toThrow(/Variáveis de ambiente inválidas/);
  });

  it('rejeita um valor de NODE_ENV desconhecido', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow(
      /Variáveis de ambiente inválidas/,
    );
  });
});
