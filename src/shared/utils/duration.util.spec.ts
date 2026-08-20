import { durationToSeconds } from './duration.util';

describe('durationToSeconds', () => {
  it.each([
    ['60s', 60],
    ['15m', 900],
    ['24h', 86400],
    ['7d', 604800],
    ['1s', 1],
    ['0d', 0],
  ])('converte "%s" para %i segundos', (value, expected) => {
    expect(durationToSeconds(value)).toBe(expected);
  });

  it('remove espaços em branco antes de fazer o parse', () => {
    expect(durationToSeconds('  5m  ')).toBe(300);
  });

  it.each(['10', '10x', 'abc', '', '10 minutes', '-5m'])(
    'lança erro para formato inválido "%s"',
    (value) => {
      expect(() => durationToSeconds(value)).toThrow(/Invalid duration format/);
    },
  );
});
