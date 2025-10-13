import { CampaignCategory, ForWho } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha',
    example: 'Campanha de Vacinação Animal',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descrição detalhada da campanha',
    example: 'Campanha para vacinar animais de rua contra doenças',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Valor alvo da campanha em Kz',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  targetValue: number;

  @ApiProperty({
    description: 'Para quem é destinada a campanha',
    enum: ForWho,
    example: ForWho.FOR_A_ANIMAL,
  })
  @IsEnum(ForWho)
  forWho: ForWho;

  @ApiProperty({
    description: 'Categoria da campanha',
    enum: CampaignCategory,
    example: CampaignCategory.HEALTH,
  })
  @IsEnum(CampaignCategory)
  category: CampaignCategory;
}
