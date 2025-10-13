import { Injectable } from '@nestjs/common';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignService } from '../campaign/campaign.service';
import { IDonationResponse } from './interfaces';
import { UsersService } from '../users/users.service';

@Injectable()
export class ContributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
    private readonly userService: UsersService,
  ) {}
  async donate(
    createContributionDto: CreateContributionDto,
    userId: string,
  ): Promise<IDonationResponse> {
    const user = await this.userService.findOne(userId);
    const campaign = await this.campaignService.findOne(
      createContributionDto.campaignId,
    );

    const donation = await this.prisma.contribution.create({
      data: {
        amount: createContributionDto.amount,
        userId: user.id,
        campaignId: campaign.id,
        transactionId: createContributionDto.transactionId,
      },
    });
    await this.campaignService.updateCurrentAmount(
      campaign.id,
      donation.amount,
    );

    return {
      donation: {
        campaign: {
          name: campaign.name,
        },
        value: donation.amount,
        createdAt: donation.createdAt,
        updatedAt: donation.updatedAt,
      },
    };
  }

  findAll() {
    return `This action returns all contribution`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contribution`;
  }

  update(id: number, updateContributionDto: UpdateContributionDto) {
    return `This action updates a #${id} contribution`;
  }

  remove(id: number) {
    return `This action removes a #${id} contribution`;
  }
}
