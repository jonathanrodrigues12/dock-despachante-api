import { Reflector } from '@nestjs/core';
import { PoliciesGuard } from './policies.guard';
import { CaslAbilityFactory, AppAbility } from '../casl-ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies';
import { Role } from '../../common/entity/rolebase';

function makeAbility(can: boolean): AppAbility {
  return { can: () => can } as any;
}

function buildGuard(handlers: any[], user: any) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'get').mockImplementation((key) => {
    if (key === CHECK_POLICIES_KEY) return handlers;
    return undefined;
  });

  const factory = new CaslAbilityFactory();

  const context = {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;

  return { guard: new PoliciesGuard(reflector, factory), context };
}

describe('PoliciesGuard', () => {
  it('retorna true quando não há handlers definidos', async () => {
    const { guard, context } = buildGuard([], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('retorna true quando todos os handlers de função retornam true', async () => {
    const handler = jest.fn().mockReturnValue(true);
    const { guard, context } = buildGuard([handler], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('retorna false quando um handler de função retorna false', async () => {
    const handler = jest.fn().mockReturnValue(false);
    const { guard, context } = buildGuard([handler], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('suporta handlers no formato objeto com método handle()', async () => {
    const objectHandler = { handle: jest.fn().mockReturnValue(true) };
    const { guard, context } = buildGuard([objectHandler], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(objectHandler.handle).toHaveBeenCalled();
  });

  it('retorna false quando handler objeto retorna false', async () => {
    const objectHandler = { handle: jest.fn().mockReturnValue(false) };
    const { guard, context } = buildGuard([objectHandler], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('todos os handlers devem passar (AND lógico)', async () => {
    const h1 = jest.fn().mockReturnValue(true);
    const h2 = jest.fn().mockReturnValue(false);
    const { guard, context } = buildGuard([h1, h2], { role: Role.ADMIN, userId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});
