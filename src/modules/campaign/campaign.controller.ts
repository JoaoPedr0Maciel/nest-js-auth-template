import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('campaigns')
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova campanha' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Campanha criada com sucesso',
    schema: {
      example: {
        id: 1,
        name: 'Campanha de Vacinação Animal',
        description: 'Campanha para vacinar animais de rua contra doenças',
        targetValue: 50000,
        forWho: 'ANIMALS',
        category: 'HEALTH',
        slug: 'campanha-de-vacinacao-animal',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiBody({ type: CreateCampaignDto })
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignService.create(createCampaignDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar campanhas com filtros' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Lista de campanhas obtida com sucesso',
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiQuery({ type: CampaignQueryDto })
  findAll(@Query() query: CampaignQueryDto, @CurrentUser() user: RequestUser) {
    return this.campaignService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter campanha por ID' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID da campanha', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Campanha encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Public()
  @Get('campanha/:slug')
  @ApiOperation({ summary: 'Obter campanha por slug' })
  @ApiParam({
    name: 'slug',
    description: 'Slug da campanha',
    example: 'campanha-de-vacinacao-animal',
  })
  @ApiResponse({
    status: 200,
    description: 'Campanha encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  findOneBySlug(@Param('slug') slug: string) {
    return this.campaignService.findOneBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar campanha' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID da campanha', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Campanha atualizada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiBody({ type: UpdateCampaignDto })
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir campanha' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID da campanha', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Campanha excluída com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  remove(@Param('id') id: string) {
    return this.campaignService.remove(id);
  }
}
