import { Injectable } from '@nestjs/common';
import { Ability, AbilityBuilder } from '@casl/ability';
import { RequestUser } from '../interfaces/user.interface';
import { AppAbility } from './ability.type';
import { permissions } from './permissions';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: RequestUser): AppAbility {
    const builder = new AbilityBuilder<AppAbility>(Ability);

    permissions[user.role](user, builder);

    return builder.build();
  }
}
