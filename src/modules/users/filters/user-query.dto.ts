import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from '../../../common/pagination';

export class UserQueryDto extends Pagination {
  @ApiPropertyOptional({
    description: 'Filtra usuários cujo email contém este valor',
    example: 'joao',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filtra usuários cujo telefone contém este valor',
    example: '5511999',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
