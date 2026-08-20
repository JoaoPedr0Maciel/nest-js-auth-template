import {
  defaultPagination,
  getPagination,
  paginationQuery,
} from './pagination';

describe('defaultPagination', () => {
  it('usa página 1 e limite 15 como padrão quando nada é informado', () => {
    expect(defaultPagination({})).toEqual({
      page: '1',
      limit: '15',
      skip: '0',
    });
  });

  it('calcula o skip a partir da página e limite informados', () => {
    expect(defaultPagination({ page: '3', limit: '10' })).toEqual({
      page: '3',
      limit: '10',
      skip: '20',
    });
  });
});

describe('paginationQuery', () => {
  it('retorna skip/take prontos pro Prisma', () => {
    expect(paginationQuery({ page: '2', limit: '5' })).toEqual({
      skip: 5,
      take: 5,
    });
  });

  it('usa os padrões quando page/limit são omitidos', () => {
    expect(paginationQuery({})).toEqual({ skip: 0, take: 15 });
  });
});

describe('getPagination', () => {
  it('monta o meta de paginação com próxima e página anterior disponíveis', () => {
    expect(getPagination({ page: 2, limit: 15, count: 42 })).toEqual({
      total: 42,
      page: 2,
      limit: 15,
      pages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('não tem página anterior na página 1', () => {
    const result = getPagination({ page: 1, limit: 15, count: 42 });
    expect(result.hasPreviousPage).toBe(false);
    expect(result.hasNextPage).toBe(true);
  });

  it('não tem próxima página na última página', () => {
    const result = getPagination({ page: 3, limit: 15, count: 42 });
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('lida com um resultado vazio', () => {
    expect(getPagination({ count: 0 })).toEqual({
      total: 0,
      page: 1,
      limit: 15,
      pages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
