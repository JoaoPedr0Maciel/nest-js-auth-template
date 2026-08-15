import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Compartilhado por `disable` e `recovery-codes/regenerate` — ambas exigem
 * a mesma prova de identidade (senha + segundo fator), mesmo padrão de
 * reaproveitar `UpdatePasswordDto` entre `updatePassword`/`updateMyPassword`
 * em `modules/users`.
 */
export class TwoFactorConfirmIdentityDto {
  @ApiProperty({ description: 'Senha atual do usuário' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description:
      'Código de 6 dígitos do aplicativo autenticador, ou um código de recuperação (formato XXXX-XXXX)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
