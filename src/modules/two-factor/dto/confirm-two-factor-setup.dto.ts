import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmTwoFactorSetupDto {
  @ApiProperty({
    description: 'Código de 6 dígitos gerado pelo aplicativo autenticador',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'O código deve conter exatamente 6 dígitos' })
  code: string;
}
