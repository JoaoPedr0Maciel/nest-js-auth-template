import { Secret, TOTP } from 'otpauth';

// Tolerância de 1 passo (±30s) pra clock drift entre o celular e o servidor —
// RFC 6238 §5.2 recomenda aceitar essa janela em vez de exigir sincronismo exato.
const TOTP_VERIFY_WINDOW = 1;
const TOTP_SECRET_SIZE_BYTES = 20;

export function generateTotpSecret(): string {
  return new Secret({ size: TOTP_SECRET_SIZE_BYTES }).base32;
}

export function buildTotpAuthUrl(params: {
  issuer: string;
  label: string;
  secret: string;
}): string {
  const totp = new TOTP({
    issuer: params.issuer,
    label: params.label,
    secret: Secret.fromBase32(params.secret),
  });

  return totp.toString();
}

export function generateTotpCode(secret: string): string {
  const totp = new TOTP({ secret: Secret.fromBase32(secret) });
  return totp.generate();
}

export function verifyTotpCode(code: string, secret: string): boolean {
  const totp = new TOTP({ secret: Secret.fromBase32(secret) });
  const delta = totp.validate({ token: code, window: TOTP_VERIFY_WINDOW });

  return delta !== null;
}
