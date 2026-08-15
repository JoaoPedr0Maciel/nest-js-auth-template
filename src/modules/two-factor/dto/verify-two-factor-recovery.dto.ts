import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorRecoveryDto {
  @ApiProperty({
    description:
      'Token de desafio retornado por POST /auth/login quando o 2FA está ativo',
    example: '3f6a1a4e-2f7b-4b8a-9c3e-1a2b3c4d5e6f',
  })
  @IsUUID()
  @IsNotEmpty()
  challengeToken: string;

  @ApiProperty({
    description: 'Código de recuperação no formato XXXX-XXXX',
    example: 'AB2C-3DE4',
  })
  @IsString()
  @IsNotEmpty()
  recoveryCode: string;
}
