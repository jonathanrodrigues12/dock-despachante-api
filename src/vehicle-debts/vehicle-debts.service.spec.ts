import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { VehicleDebtsService } from './vehicle-debts.service';
import { ProviderChainService } from './providers/provider-chain.service';
import { VEHICLE_DEBTS_PROVIDERS } from './interfaces/vehicle-debts-provider.interface';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});

const REF_DATE = new Date('2024-05-10T00:00:00Z');

function makeChain(providers: { getDebts: jest.Mock }[]) {
  return new ProviderChainService(providers as any);
}

async function buildService(chain: ProviderChainService) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VehicleDebtsService,
      { provide: ProviderChainService, useValue: chain },
    ],
  }).compile();
  return module.get<VehicleDebtsService>(VehicleDebtsService);
}

describe('VehicleDebtsService', () => {
  beforeAll(() => {
    process.env.REFERENCE_DATE = '2024-05-10T00:00:00Z';
  });

  afterAll(() => {
    delete process.env.REFERENCE_DATE;
  });

  it('returns enriched debts + payment options for ABC1234 (spec golden path)', async () => {
    const chain = makeChain([
      {
        getDebts: jest.fn().mockResolvedValue({
          plate: 'ABC1234',
          debts: [
            { type: 'IPVA', amount: 1500.0, due_date: '2024-01-10' },
            { type: 'MULTA', amount: 300.5, due_date: '2024-02-15' },
          ],
        }),
      },
    ]);
    const svc = await buildService(chain);
    const res = await svc.getDebtsByPlate('ABC1234');

    expect(res.placa).toBe('ABC1234');
    expect(res.debitos).toHaveLength(2);
    expect(res.debitos[0]).toMatchObject({ tipo: 'IPVA', valor_atualizado: '1800.00', dias_atraso: 121 });
    expect(res.debitos[1]).toMatchObject({ tipo: 'MULTA', valor_atualizado: '555.93', dias_atraso: 85 });
    expect(res.resumo.total_original).toBe('1800.50');
    expect(res.resumo.total_atualizado).toBe('2355.93');

    const total = res.pagamentos.opcoes.find((o) => o.tipo === 'TOTAL')!;
    expect(total.pix.total_com_desconto).toBe('2238.13');
    expect(total.cartao_credito.parcelas).toHaveLength(3);
    expect(total.cartao_credito.parcelas[0]).toMatchObject({ quantidade: 1, valor_parcela: '2355.93' });
    expect(total.cartao_credito.parcelas[1]).toMatchObject({ quantidade: 6, valor_parcela: '427.72' });
    expect(total.cartao_credito.parcelas[2]).toMatchObject({ quantidade: 12, valor_parcela: '229.67' });

    const ipvaOpt = res.pagamentos.opcoes.find((o) => o.tipo === 'SOMENTE_IPVA')!;
    expect(ipvaOpt.pix.total_com_desconto).toBe('1710.00');
    expect(ipvaOpt.cartao_credito.parcelas[1].valor_parcela).toBe('326.79');
    expect(ipvaOpt.cartao_credito.parcelas[2].valor_parcela).toBe('175.48');

    const multaOpt = res.pagamentos.opcoes.find((o) => o.tipo === 'SOMENTE_MULTA')!;
    expect(multaOpt.pix.total_com_desconto).toBe('528.13');
    expect(multaOpt.cartao_credito.parcelas[1].valor_parcela).toBe('100.93');
    expect(multaOpt.cartao_credito.parcelas[2].valor_parcela).toBe('54.20');
  });

  it('throws NotFoundException when plate is not found', async () => {
    const chain = makeChain([{ getDebts: jest.fn().mockResolvedValue(null) }]);
    const svc = await buildService(chain);
    await expect(svc.getDebtsByPlate('ZZZ9999')).rejects.toThrow(NotFoundException);
  });

  it('returns empty debits for plate with zero debts', async () => {
    const chain = makeChain([{ getDebts: jest.fn().mockResolvedValue({ plate: 'DEF5555', debts: [] }) }]);
    const svc = await buildService(chain);
    const res = await svc.getDebtsByPlate('DEF5555');
    expect(res.debitos).toHaveLength(0);
    expect(res.resumo.total_original).toBe('0.00');
    expect(res.resumo.total_atualizado).toBe('0.00');
  });

  it('throws 422 for unknown debt type', async () => {
    const chain = makeChain([
      {
        getDebts: jest.fn().mockResolvedValue({
          plate: 'XYZ9876',
          debts: [{ type: 'SEGURO_OBRIGATORIO', amount: 180, due_date: '2024-01-01' }],
        }),
      },
    ]);
    const svc = await buildService(chain);
    await expect(svc.getDebtsByPlate('XYZ9876')).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('ProviderChainService — fallback', () => {
  beforeEach(() => {
    process.env.PROVIDER_RETRY_ATTEMPTS = '0';
    process.env.PROVIDER_RETRY_DELAY_MS = '0';
    process.env.CIRCUIT_BREAKER_THRESHOLD = '3';
    process.env.CIRCUIT_BREAKER_COOLDOWN_MS = '30000';
  });

  it('falls back to second provider when first throws', async () => {
    const p1 = { getDebts: jest.fn().mockRejectedValue(new Error('timeout')) };
    const p2 = {
      getDebts: jest.fn().mockResolvedValue({ plate: 'ABC1234', debts: [] }),
    };
    const chain = makeChain([p1, p2]);
    const result = await chain.getDebts('ABC1234');
    expect(result).not.toBeNull();
    expect(p1.getDebts).toHaveBeenCalled();
    expect(p2.getDebts).toHaveBeenCalled();
  });

  it('throws 503 when all providers fail', async () => {
    const p1 = { getDebts: jest.fn().mockRejectedValue(new Error('down')) };
    const p2 = { getDebts: jest.fn().mockRejectedValue(new Error('down')) };
    const chain = makeChain([p1, p2]);
    await expect(chain.getDebts('ABC1234')).rejects.toThrow(ServiceUnavailableException);
  });

  it('returns null (not found) without trying next provider', async () => {
    const p1 = { getDebts: jest.fn().mockResolvedValue(null) };
    const p2 = { getDebts: jest.fn().mockResolvedValue({ plate: 'ABC1234', debts: [] }) };
    const chain = makeChain([p1, p2]);
    const result = await chain.getDebts('ABC1234');
    expect(result).toBeNull();
    expect(p2.getDebts).not.toHaveBeenCalled();
  });
});

describe('ProviderChainService — retry with backoff', () => {
  beforeEach(() => {
    process.env.PROVIDER_RETRY_ATTEMPTS = '2';
    process.env.PROVIDER_RETRY_DELAY_MS = '0';
    process.env.CIRCUIT_BREAKER_THRESHOLD = '99';
    process.env.CIRCUIT_BREAKER_COOLDOWN_MS = '30000';
  });

  it('retries a failing provider before falling back', async () => {
    const p1 = { getDebts: jest.fn().mockRejectedValue(new Error('flaky')) };
    const p2 = { getDebts: jest.fn().mockResolvedValue({ plate: 'ABC1234', debts: [] }) };
    const chain = makeChain([p1, p2]);

    await chain.getDebts('ABC1234');

    // 1 initial attempt + 2 retries = 3 total calls to p1
    expect(p1.getDebts).toHaveBeenCalledTimes(3);
    expect(p2.getDebts).toHaveBeenCalledTimes(1);
  });

  it('succeeds on second attempt without hitting fallback', async () => {
    const p1 = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValue({ plate: 'ABC1234', debts: [] });
    const provider = { getDebts: p1 };
    const chain = makeChain([provider]);

    const result = await chain.getDebts('ABC1234');

    expect(result).not.toBeNull();
    expect(p1).toHaveBeenCalledTimes(2);
  });
});

describe('ProviderChainService — circuit breaker', () => {
  beforeEach(() => {
    process.env.PROVIDER_RETRY_ATTEMPTS = '0';
    process.env.PROVIDER_RETRY_DELAY_MS = '0';
    process.env.CIRCUIT_BREAKER_THRESHOLD = '3';
    process.env.CIRCUIT_BREAKER_COOLDOWN_MS = '30000';
  });

  it('opens circuit after threshold failures and skips provider', async () => {
    const p1 = { getDebts: jest.fn().mockRejectedValue(new Error('down')) };
    const p2 = { getDebts: jest.fn().mockResolvedValue({ plate: 'ABC1234', debts: [] }) };
    const chain = makeChain([p1, p2]);

    // exhaust threshold (3 failures open the circuit)
    for (let i = 0; i < 3; i++) {
      await chain.getDebts('ABC1234').catch(() => {});
    }

    p1.getDebts.mockClear();
    p2.getDebts.mockClear();

    // circuit is now OPEN — p1 must be skipped entirely
    await chain.getDebts('ABC1234');

    expect(p1.getDebts).not.toHaveBeenCalled();
    expect(p2.getDebts).toHaveBeenCalledTimes(1);
  });

  it('resets circuit after cooldown and retries provider', async () => {
    process.env.CIRCUIT_BREAKER_COOLDOWN_MS = '0';

    const p1 = { getDebts: jest.fn().mockRejectedValue(new Error('down')) };
    const chain = makeChain([p1]);

    // open the circuit
    for (let i = 0; i < 3; i++) {
      await chain.getDebts('ABC1234').catch(() => {});
    }

    p1.getDebts.mockResolvedValue({ plate: 'ABC1234', debts: [] });
    p1.getDebts.mockClear();

    // cooldown=0 means circuit should be HALF-OPEN immediately
    const result = await chain.getDebts('ABC1234');

    expect(result).not.toBeNull();
    expect(p1.getDebts).toHaveBeenCalledTimes(1);
  });
});
