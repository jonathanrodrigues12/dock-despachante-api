import { ServiceUnavailableException } from '@nestjs/common';
import { MockProviderAService } from './mock-provider-a.service';

describe('MockProviderAService', () => {
  let service: MockProviderAService;

  beforeEach(() => {
    service = new MockProviderAService();
    delete process.env.SIMULATE_PROVIDER_A_FAILURE;
  });

  afterEach(() => {
    delete process.env.SIMULATE_PROVIDER_A_FAILURE;
  });

  it('retorna débitos para placa conhecida (ABC1234)', async () => {
    const result = await service.getDebts('ABC1234');
    expect(result).not.toBeNull();
    expect(result!.plate).toBe('ABC1234');
    expect(result!.provider).toBe('A');
    expect(result!.debts).toHaveLength(2);
    expect(result!.debts[0]).toMatchObject({ type: 'IPVA', amount: 1500, due_date: '2024-01-10' });
    expect(result!.debts[1]).toMatchObject({ type: 'MULTA', amount: 300.5, due_date: '2024-02-15' });
  });

  it('busca placa em case-insensitive (abc1234 → ABC1234)', async () => {
    const result = await service.getDebts('abc1234');
    expect(result).not.toBeNull();
    expect(result!.plate).toBe('ABC1234');
  });

  it('retorna null para placa desconhecida', async () => {
    const result = await service.getDebts('ZZZ0000');
    expect(result).toBeNull();
  });

  it('retorna lista vazia de débitos para placa sem pendências (DEF5555)', async () => {
    const result = await service.getDebts('DEF5555');
    expect(result).not.toBeNull();
    expect(result!.debts).toHaveLength(0);
  });

  it('lança ServiceUnavailableException quando SIMULATE_PROVIDER_A_FAILURE=true', async () => {
    process.env.SIMULATE_PROVIDER_A_FAILURE = 'true';
    await expect(service.getDebts('ABC1234')).rejects.toThrow(ServiceUnavailableException);
  });
});
