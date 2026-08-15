import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorSetupResponseDto {
  @ApiProperty({
    description:
      'Chave para cadastro manual no aplicativo autenticador, caso o QR code não possa ser escaneado',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manualEntryKey: string;

  @ApiProperty({
    description: 'URI otpauth:// para gerar o QR code no cliente',
    example:
      'otpauth://totp/NestJS%20Auth%20Template:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=NestJS%20Auth%20Template',
  })
  otpauthUrl: string;

  @ApiProperty({
    description: 'QR code pronto para exibição, como data URL (PNG em base64)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCodeDataUrl: string;
}
