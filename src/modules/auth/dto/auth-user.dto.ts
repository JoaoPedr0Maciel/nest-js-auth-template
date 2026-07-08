import { ApiProperty } from '@nestjs/swagger';
import { AuthUserSummaryDto } from './auth-user-summary.dto';

export class AuthUserDto extends AuthUserSummaryDto {
  @ApiProperty({ example: 'joao@example.com' })
  email: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
