import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

export const errors = {
  user: {
    not_found: new NotFoundException('User not found'),
    already_exists: new ConflictException('User already exists'),
    phone_already_exists: new ConflictException('User phone already exists'),
    phone_not_valid: new BadRequestException('User phone not valid'),
    password_not_valid: new BadRequestException('User password not valid'),
  },
  campaign: {
    not_found: new NotFoundException('Campaign not found'),
    already_exists: new ConflictException('Campaign already exists'),
    phone_already_exists: new ConflictException('Campaign phone already exists'),
    phone_not_valid: new BadRequestException('Campaign phone not valid'),
    password_not_valid: new BadRequestException('Campaign password not valid'),
  },
  contribution: {
    not_found: new NotFoundException('Contribution not found'),
  },
}