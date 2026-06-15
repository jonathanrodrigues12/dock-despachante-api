import { JwtStrategy } from './jwt.strategy';
import { Role } from '../common/entity/rolebase';

function makeEnvService(secret = 'test-secret') {
  return { get: jest.fn().mockReturnValue(secret) };
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(makeEnvService() as any);
  });

  describe('validate', () => {
    it('retorna payload com userId e role para payload válido', async () => {
      const payload = { userId: '550e8400-e29b-41d4-a716-446655440000', role: Role.ADMIN };
      const result = await strategy.validate(payload as any);
      expect(result.userId).toBe(payload.userId);
      expect(result.role).toBe(Role.ADMIN);
    });

    it('lança erro para userId que não é UUID', async () => {
      const payload = { userId: 'nao-e-um-uuid', role: Role.ADMIN };
      await expect(strategy.validate(payload as any)).rejects.toBeDefined();
    });

    it('lança erro para role inválida', async () => {
      const payload = { userId: '550e8400-e29b-41d4-a716-446655440000', role: 'SUPERUSER' };
      await expect(strategy.validate(payload as any)).rejects.toBeDefined();
    });

    it('lança erro quando userId está ausente', async () => {
      const payload = { role: Role.ADMIN };
      await expect(strategy.validate(payload as any)).rejects.toBeDefined();
    });
  });
});
