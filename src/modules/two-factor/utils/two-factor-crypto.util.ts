import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

/**
 * O segredo TOTP precisa ser lido de volta a cada login pra gerar o código
 * esperado — ao contrário de senha/recovery code, não dá pra guardar só um
 * hash. Por isso cifra (reversível) em vez de bcrypt (uma via).
 */
function deriveKey(encryptionKey: string): Buffer {
  return createHash('sha256').update(encryptionKey).digest();
}

export function encryptTwoFactorSecret(
  secret: string,
  encryptionKey: string,
): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((buffer) => buffer.toString('base64'))
    .join('.');
}

export function decryptTwoFactorSecret(
  payload: string,
  encryptionKey: string,
): string {
  const [ivB64, authTagB64, encryptedB64] = payload.split('.');
  const key = deriveKey(encryptionKey);
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
