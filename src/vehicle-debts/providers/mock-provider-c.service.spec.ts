import { ServiceUnavailableException } from '@nestjs/common';
import { MockProviderCService } from './mock-provider-c.service';

describe('MockProviderCService', () => {
  let service: MockProviderCService;

  beforeEach(() => {
    delete process.env.SIMULATE_PROVIDER_C_FAILURE;
    service = new MockProviderCService();
  });

  it('returns null for unknown plate', async () => {
    const result = await service.getDebts('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns debts for ABC1234', async () => {
    const result = await service.getDebts('ABC1234');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('C');
    expect(result!.plate).toBe('ABC1234');
    expect(result!.debts).toHaveLength(2);
    expect(result!.debts.map((d) => d.type)).toEqual(['IPVA', 'MULTA']);
  });

  it('returns debts including LICENCIAMENTO for XYZ9876', async () => {
    const result = await service.getDebts('XYZ9876');
    expect(result).not.toBeNull();
    expect(result!.debts).toHaveLength(3);
    const types = result!.debts.map((d) => d.type);
    expect(types).toContain('LICENCIAMENTO');
    expect(types).toContain('IPVA');
    expect(types).toContain('MULTA');
  });

  it('is case-insensitive for plate lookup', async () => {
    const result = await service.getDebts('xyz9876');
    expect(result).not.toBeNull();
    expect(result!.debts).toHaveLength(3);
  });

  it('ignores rows with missing debt_type or amount (DEF5555)', async () => {
    const result = await service.getDebts('DEF5555');
    expect(result).not.toBeNull();
    expect(result!.debts).toHaveLength(0);
  });

  it('throws ServiceUnavailableException when failure is simulated', async () => {
    process.env.SIMULATE_PROVIDER_C_FAILURE = 'true';
    await expect(service.getDebts('ABC1234')).rejects.toThrow(ServiceUnavailableException);
  });
});
