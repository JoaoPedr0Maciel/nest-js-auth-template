import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensResponseDto } from './auth-tokens-response.dto';
import { AuthUserSummaryDto } from './auth-user-summary.dto';

export class LoginResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: AuthUserSummaryDto })
  user: AuthUserSummaryDto;
}
