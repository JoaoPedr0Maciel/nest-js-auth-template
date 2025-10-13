import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';

@Controller('contribution')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}
  @Post()
  async donate(
    @Body() createContributionDto: CreateContributionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contributionService.donate(createContributionDto, user.id);
  }

  @Get()
  findAll() {
    return this.contributionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contributionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContributionDto: UpdateContributionDto,
  ) {
    return this.contributionService.update(+id, updateContributionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contributionService.remove(+id);
  }
}
