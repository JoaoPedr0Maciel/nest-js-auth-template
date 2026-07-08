import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * Shape canônico do recurso User. Alguns endpoints (create, remove,
 * deactivate, updatePassword) fazem select() mais enxuto no Prisma e
 * retornam só um subconjunto desses campos — documentamos o recurso
 * completo em vez de criar uma DTO por variação de select, senão a
 * poluição só migra do controller pra uma pilha de DTOs quase iguais.
 */
export class UserResponseDto {
  @ApiProperty({ example: '3f6a1a4e-2f7b-4b8a-9c3e-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'joao@example.com' })
  email: string;

  @ApiProperty({ example: '+244923456789' })
  phone: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
