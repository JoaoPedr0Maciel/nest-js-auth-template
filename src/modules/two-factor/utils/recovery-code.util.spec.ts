import { generateRecoveryCodes } from './recovery-code.util';

describe('recovery-code.util', () => {
  it('gera a quantidade padrão de códigos, todos únicos', () => {
    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it('gera cada código no formato XXXX-XXXX', () => {
    const codes = generateRecoveryCodes();

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it('respeita a quantidade solicitada', () => {
    const codes = generateRecoveryCodes(3);

    expect(codes).toHaveLength(3);
  });
});
