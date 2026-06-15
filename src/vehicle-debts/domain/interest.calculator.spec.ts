import { UnprocessableEntityException } from '@nestjs/common';
import { enrichDebts, roundHalfUp } from './interest.calculator';

const REF_DATE = new Date('2024-05-10T00:00:00Z');

describe('roundHalfUp', () => {
  it('rounds 255.425 → 255.43', () => {
    expect(roundHalfUp(255.425, 2)).toBe(255.43);
  });

  it('rounds 255.424 → 255.42', () => {
    expect(roundHalfUp(255.424, 2)).toBe(255.42);
  });
});

describe('enrichDebts — IPVA', () => {
  it('applies 0.33%/day capped at 20% (spec example)', () => {
    const [debt] = enrichDebts(
      [{ type: 'IPVA', amount: 1500.0, due_date: '2024-01-10' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(121);
    expect(debt.valor_original).toBe('1500.00');
    expect(debt.valor_atualizado).toBe('1800.00');
  });

  it('applies raw interest when under 20% cap', () => {
    // 10 days late: 1500 * 0.0033 * 10 = 49.50 < 300 cap
    const [debt] = enrichDebts(
      [{ type: 'IPVA', amount: 1500.0, due_date: '2024-04-30' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(10);
    expect(debt.valor_atualizado).toBe('1549.50');
  });
});

describe('enrichDebts — MULTA', () => {
  it('applies 1%/day no cap (spec example)', () => {
    const [debt] = enrichDebts(
      [{ type: 'MULTA', amount: 300.5, due_date: '2024-02-15' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(85);
    expect(debt.valor_original).toBe('300.50');
    expect(debt.valor_atualizado).toBe('555.93');
  });
});

describe('enrichDebts — LICENCIAMENTO', () => {
  it('applies 0.33%/day capped at 20% (same rule as IPVA)', () => {
    // 20 days late: 180 * 0.0033 * 20 = 11.88 < 36 cap
    const [debt] = enrichDebts(
      [{ type: 'LICENCIAMENTO', amount: 180.0, due_date: '2024-04-20' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(20);
    expect(debt.valor_original).toBe('180.00');
    expect(debt.valor_atualizado).toBe('191.88');
  });

  it('caps at 20% when interest exceeds limit', () => {
    // 200 days late: 180 * 0.0033 * 200 = 118.80 > 36 cap → capped at 36
    const [debt] = enrichDebts(
      [{ type: 'LICENCIAMENTO', amount: 180.0, due_date: '2023-10-23' }],
      REF_DATE,
    );
    expect(debt.valor_atualizado).toBe('216.00');
  });
});

describe('enrichDebts — edge cases', () => {
  it('non-overdue debt: dias_atraso=0, valor_atualizado=valor_original', () => {
    const [debt] = enrichDebts(
      [{ type: 'IPVA', amount: 1000.0, due_date: '2024-12-31' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(0);
    expect(debt.valor_atualizado).toBe('1000.00');
  });

  it('due today: dias_atraso=0, no interest', () => {
    const [debt] = enrichDebts(
      [{ type: 'MULTA', amount: 500.0, due_date: '2024-05-10' }],
      REF_DATE,
    );
    expect(debt.dias_atraso).toBe(0);
    expect(debt.valor_atualizado).toBe('500.00');
  });

  it('throws 422 for unknown debt type', () => {
    expect(() =>
      enrichDebts([{ type: 'SEGURO_OBRIGATORIO', amount: 100, due_date: '2024-01-01' }], REF_DATE),
    ).toThrow(UnprocessableEntityException);
  });

  it('empty debt list returns empty array', () => {
    expect(enrichDebts([], REF_DATE)).toEqual([]);
  });
});
