import { userCacheSchema } from './user-cache.schema';

const validPayload = {
  id: '1',
  email: 'joao@example.com',
  phone: '+5511999999999',
  name: 'João',
  role: 'USER',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('userCacheSchema', () => {
  it('faz parse de um payload válido do cache e converte as datas', () => {
    const result = userCacheSchema.parse(validPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.role).toBe('USER');
  });

  it('rejeita um payload sem um campo obrigatório', () => {
    const { name: _drop, ...rest } = validPayload;
    void _drop;

    expect(userCacheSchema.safeParse(rest).success).toBe(false);
  });

  it('rejeita um role fora do enum conhecido', () => {
    expect(
      userCacheSchema.safeParse({ ...validPayload, role: 'SUPERADMIN' })
        .success,
    ).toBe(false);
  });

  it('rejeita uma string de data inválida', () => {
    expect(
      userCacheSchema.safeParse({ ...validPayload, createdAt: 'not-a-date' })
        .success,
    ).toBe(false);
  });
});
