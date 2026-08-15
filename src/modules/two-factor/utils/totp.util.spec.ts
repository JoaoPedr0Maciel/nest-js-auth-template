import {
  buildTotpAuthUrl,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from './totp.util';

describe('totp.util', () => {
  it('gera um código válido para o segredo gerado e aceita na verificação', () => {
    const secret = generateTotpSecret();
    const code = generateTotpCode(secret);

    expect(verifyTotpCode(code, secret)).toBe(true);
  });

  it('rejeita um código que não corresponde ao segredo', () => {
    const secret = generateTotpSecret();

    expect(verifyTotpCode('000000', secret)).toBe(false);
  });

  it('monta a URI otpauth:// com issuer e label', () => {
    const uri = buildTotpAuthUrl({
      issuer: 'MyApp',
      label: 'user@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('MyApp');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
  });
});
