import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description:
      'Token de desafio retornado por POST /auth/login quando o 2FA está ativo',
    example: '3f6a1a4e-2f7b-4b8a-9c3e-1a2b3c4d5e6f',
  })
  @IsUUID()
  @IsNotEmpty()
  challengeToken: string;

  @ApiProperty({
    description: 'Código de 6 dígitos gerado pelo aplicativo autenticador',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'O código deve conter exatamente 6 dígitos' })
  code: string;
}
