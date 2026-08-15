import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorRecoveryCodesResponseDto {
  @ApiProperty({
    description:
      'Códigos de recuperação — cada um só pode ser usado uma vez. Guarde-os em local seguro, eles não serão mostrados novamente',
    example: ['AB2C-3DE4', 'FG5H-6JK7'],
    type: [String],
  })
  recoveryCodes: string[];
}
