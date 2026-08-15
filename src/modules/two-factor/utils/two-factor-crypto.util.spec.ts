import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from './two-factor-crypto.util';

describe('two-factor-crypto.util', () => {
  const encryptionKey = 'a'.repeat(32);

  it('decifra de volta o mesmo segredo que foi cifrado', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    const encrypted = encryptTwoFactorSecret(secret, encryptionKey);
    const decrypted = decryptTwoFactorSecret(encrypted, encryptionKey);

    expect(decrypted).toBe(secret);
  });

  it('gera saídas diferentes a cada chamada (IV aleatório)', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    const first = encryptTwoFactorSecret(secret, encryptionKey);
    const second = encryptTwoFactorSecret(secret, encryptionKey);

    expect(first).not.toBe(second);
  });

  it('lança erro ao decifrar com a chave errada', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTwoFactorSecret(secret, encryptionKey);

    expect(() => decryptTwoFactorSecret(encrypted, 'b'.repeat(32))).toThrow();
  });

  it('lança erro ao decifrar um payload adulterado', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTwoFactorSecret(secret, encryptionKey);
    const [iv, authTag] = encrypted.split('.');
    const tampered = [
      iv,
      authTag,
      Buffer.from('tampered').toString('base64'),
    ].join('.');

    expect(() => decryptTwoFactorSecret(tampered, encryptionKey)).toThrow();
  });
});
