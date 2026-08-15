import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorChallengeResponseDto {
  @ApiProperty({
    description:
      'Indica que a senha foi validada, mas o login só se completa em POST /auth/2fa/verify',
    example: true,
  })
  twoFactorRequired: true;

  @ApiProperty({
    description: 'Token de desafio a ser enviado em POST /auth/2fa/verify',
    example: '3f6a1a4e-2f7b-4b8a-9c3e-1a2b3c4d5e6f',
  })
  challengeToken: string;
}
