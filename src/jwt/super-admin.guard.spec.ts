import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuperAdminGuard } from './super-admin.guard';
import { Role } from '../common/entity/rolebase';
import { SUPER_ADMIN_KEY } from './super-admin-only.decorator';

function makeContext(user: any, isSuperAdminOnly: boolean): any {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'get').mockImplementation((key) => {
    if (key === SUPER_ADMIN_KEY) return isSuperAdminOnly;
    return undefined;
  });

  const guard = new SuperAdminGuard(reflector);

  const context = {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;

  return { guard, context };
}

describe('SuperAdminGuard', () => {
  it('retorna true quando rota não é superAdmin-only (sem decorator)', () => {
    const { guard, context } = makeContext({ role: Role.ADMIN }, false);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('retorna true para usuário ADMIN em rota superAdmin-only', () => {
    const { guard, context } = makeContext({ role: Role.ADMIN }, true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lança ForbiddenException quando usuário não é ADMIN em rota superAdmin-only', () => {
    const { guard, context } = makeContext({ role: 'USER' }, true);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando não há usuário no request (rota superAdmin-only)', () => {
    const { guard, context } = makeContext(undefined, true);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando user é null em rota superAdmin-only', () => {
    const { guard, context } = makeContext(null, true);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
