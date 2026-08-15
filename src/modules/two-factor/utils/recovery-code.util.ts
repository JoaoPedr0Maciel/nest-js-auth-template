import { randomBytes } from 'node:crypto';

// Sem 0/O/1/I/L — evita ambiguidade quando o usuário digita o código à mão.
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RECOVERY_CODE_SEGMENT_LENGTH = 4;
export const RECOVERY_CODE_COUNT = 10;

function randomSegment(): string {
  const bytes = randomBytes(RECOVERY_CODE_SEGMENT_LENGTH);
  let segment = '';

  for (const byte of bytes) {
    segment += RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length];
  }

  return segment;
}

export function generateRecoveryCodes(
  count: number = RECOVERY_CODE_COUNT,
): string[] {
  return Array.from(
    { length: count },
    () => `${randomSegment()}-${randomSegment()}`,
  );
}
