import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserSummaryDto {
  @ApiProperty({ example: '3f6a1a4e-2f7b-4b8a-9c3e-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: '+244923456789' })
  phone: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;
}
