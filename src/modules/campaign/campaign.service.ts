import { Injectable } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import slugify from 'slugify';
import { errors } from 'src/utils/errors.util';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import {
  defaultPagination,
  getPagination,
  paginationQuery,
} from 'src/utils/pagination.util';
import { PaginationResponse } from 'src/types/pagination';
import { Campaign } from '@prisma/client';
import { buildCampaignFilter } from './filters';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCampaignDto: CreateCampaignDto, userId: string) {
    const campaignExist = await this.prisma.campaign.findFirst({
      where: {
        name: createCampaignDto.name,
      },
    });

    if (campaignExist) {
      throw errors.campaign.already_exists;
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        ...createCampaignDto,
        userId,
        slug: slugify(createCampaignDto.name, { lower: true, strict: true }),
      },
    });

    return campaign;
  }

  async findAll(
    query: CampaignQueryDto,
    userId: string,
  ): Promise<PaginationResponse<Campaign>> {
    const { page, limit } = defaultPagination({
      limit: query.limit,
      page: query.page,
    });

    const where = {
      ...buildCampaignFilter(query),
      userId,
    };

    const [campaigns, total] = await this.prisma.$transaction(
      async (prisma) => {
        return [
          await prisma.campaign.findMany({
            where,
            ...paginationQuery({ limit, page }),
          }),
          await prisma.campaign.count({
            where,
          }),
        ];
      },
    );

    return {
      data: campaigns,
      meta: getPagination({
        count: total,
        limit: parseInt(limit),
        page: parseInt(page),
      }),
    };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        id,
      },
    });

    if (!campaign) {
      throw errors.campaign.not_found;
    }

    return campaign;
  }

  async findOneBySlug(slug: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        slug,
      },
    });

    if (!campaign) {
      throw errors.campaign.not_found;
    }

    return campaign;
  }

  update(id: string, updateCampaignDto: UpdateCampaignDto) {
    return this.prisma.campaign.update({
      where: { id },
      data: updateCampaignDto,
    });
  }

  async updateCurrentAmount(id: string, amount: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw errors.campaign.not_found;
    }

    // regra a ser consultada com o voldemort
    // if (campaign.currentValue >= campaign.targetValue) {
    //   console.log('Campaign reached its target');
    //   return;
    // }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        currentValue: amount,
      },
    });
  }

  async remove(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        id,
      },
    });

    if (!campaign) {
      throw errors.campaign.not_found;
    }

    return this.prisma.campaign.delete({
      where: { id },
    });
  }
}
