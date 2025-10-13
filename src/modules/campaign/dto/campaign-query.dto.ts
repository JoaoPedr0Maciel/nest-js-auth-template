import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CampaignQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: '1',
    default: '1',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: '10',
    default: '10',
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Filtrar campanhas por nome',
    example: 'vacinação',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filtrar campanhas por status ativo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsString()
  isActive?: string;
}
