import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateContributionDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Amount of contribution',
    example: 10000,
  })
  amount: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Campaign ID',
    example: '123',
  })
  campaignId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Transaction ID',
    example: '123',
  })
  transactionId: string;
}
