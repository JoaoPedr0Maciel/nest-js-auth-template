import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './ability.type';

export const CHECK_POLICIES_KEY = 'check_policies';

export type PolicyHandler = (ability: AppAbility) => boolean;

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
