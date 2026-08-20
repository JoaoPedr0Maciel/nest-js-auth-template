import { BadRequestException } from '@nestjs/common';
import { normalizePhone } from './phone.util';

describe('normalizePhone', () => {
  it('retorna o número em formato E.164 quando válido', () => {
    expect(normalizePhone('+5511999999999')).toBe('+5511999999999');
  });

  it('lança BadRequestException para um número de telefone inválido', () => {
    expect(() => normalizePhone('not-a-phone')).toThrow(BadRequestException);
  });

  it('lança BadRequestException para um número sem código do país', () => {
    expect(() => normalizePhone('999999999')).toThrow(BadRequestException);
  });
});
