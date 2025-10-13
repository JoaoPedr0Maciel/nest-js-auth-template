import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { Prisma } from '@prisma/client';

export const buildCampaignFilter = (query: CampaignQueryDto) => {
  const { name, isActive } = query;
  const isActiveBoolean = isActive === 'true';
  const insensitive = Prisma.QueryMode.insensitive;

  return {
    ...(name && { name: { contains: name, mode: insensitive } }),
    ...(isActive && { isActive: isActiveBoolean }),
  };
};
