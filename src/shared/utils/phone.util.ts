import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizePhone(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone);

  if (!parsed || !parsed.isValid()) {
    throw new BadRequestException('Invalid phone number');
  }

  return parsed.number;
}
