import { CaslAbilityFactory } from './casl-ability.factory';
import { Action } from '../common/entity/actionbase';
import { Role } from '../common/entity/rolebase';
import { IJwtPayload } from '../jwt/jwt.strategy';

function makeUser(role: Role): IJwtPayload {
  return { userId: 'uuid-test', role } as any;
}

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  beforeEach(() => {
    factory = new CaslAbilityFactory();
  });

  describe('Role.ADMIN', () => {
    let ability: ReturnType<CaslAbilityFactory['createForUser']>;

    beforeEach(() => {
      ability = factory.createForUser(makeUser(Role.ADMIN));
    });

    it('pode LIST em "all"', () => {
      expect(ability.can(Action.LIST, 'all')).toBe(true);
    });

    it('pode READ em "all"', () => {
      expect(ability.can(Action.READ, 'all')).toBe(true);
    });

    it('pode CREATE em "all"', () => {
      expect(ability.can(Action.CREATE, 'all')).toBe(true);
    });

    it('pode UPDATE em "all"', () => {
      expect(ability.can(Action.UPDATE, 'all')).toBe(true);
    });

    it('pode DELETE em "all"', () => {
      expect(ability.can(Action.DELETE, 'all')).toBe(true);
    });
  });
});
