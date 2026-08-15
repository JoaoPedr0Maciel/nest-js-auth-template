import { buildUsersWhere } from './index';

describe('buildUsersWhere', () => {
  it('retorna um filtro vazio quando nenhum query param é informado', () => {
    expect(buildUsersWhere({})).toEqual({});
  });

  it('filtra por email, contains case-insensitive', () => {
    expect(buildUsersWhere({ email: 'joao' })).toEqual({
      email: { contains: 'joao', mode: 'insensitive' },
    });
  });

  it('filtra por telefone contains', () => {
    expect(buildUsersWhere({ phone: '5511999' })).toEqual({
      phone: { contains: '5511999' },
    });
  });

  it('combina os filtros de email e telefone', () => {
    expect(buildUsersWhere({ email: 'joao', phone: '5511999' })).toEqual({
      email: { contains: 'joao', mode: 'insensitive' },
      phone: { contains: '5511999' },
    });
  });
});
