import {
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
  PureAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User } from '../users/users.entity';
import { Action } from '../common/entity/actionbase';
import { IJwtPayload } from '../jwt/jwt.strategy';
import { Role } from '../common/entity/rolebase';

type Subjects = InferSubjects<typeof User> | 'all';
export type AppAbility = PureAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: IJwtPayload) {
    const { can, build } = new AbilityBuilder<PureAbility<[Action, Subjects]>>(
      PureAbility as AbilityClass<AppAbility>,
    );

    switch (user.role) {
      case Role.ADMIN:
        {
          can(Action.LIST, 'all');
          can(Action.READ, 'all');
          can(Action.UPDATE, 'all');
          can(Action.DELETE, 'all');
          can(Action.CREATE, 'all');
        }
        break;
    }

    return build({
      detectSubjectType: (item) => item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
