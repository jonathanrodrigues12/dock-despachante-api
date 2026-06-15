import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt.guard';
import { IS_PUBLIC_KEY } from './public';

function makeContext(handler: object, klass: object): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as any;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('retorna true imediatamente para rotas marcadas como @Public()', () => {
    const guard = new JwtAuthGuard(reflector);
    const handler = {};
    const klass = {};

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const result = guard.canActivate(makeContext(handler, klass));
    expect(result).toBe(true);
  });

  it('delega para AuthGuard("jwt") em rotas privadas', () => {
    const guard = new JwtAuthGuard(reflector);

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    // AuthGuard base tentará validar o JWT; para não falhar no teste apenas
    // verificamos que canActivate não retorna true diretamente
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(makeContext({}, {}));
    expect(superSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
