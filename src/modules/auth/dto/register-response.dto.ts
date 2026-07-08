import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensResponseDto } from './auth-tokens-response.dto';
import { AuthUserDto } from './auth-user.dto';

export class RegisterResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
