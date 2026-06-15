import { buildPaymentOptions } from './payment.calculator';
import { EnrichedDebt } from './interest.calculator';

function makeDebt(tipo: string, valor_atualizado: string): EnrichedDebt {
  return {
    tipo,
    valor_original: valor_atualizado,
    valor_atualizado,
    vencimento: '2024-01-01',
    dias_atraso: 0,
  };
}

describe('buildPaymentOptions — lista vazia', () => {
  it('retorna TOTAL zerado e sem opções por tipo', () => {
    const result = buildPaymentOptions([]);
    expect(result.opcoes).toHaveLength(1);
    const total = result.opcoes[0];
    expect(total.tipo).toBe('TOTAL');
    expect(total.valor_base).toBe('0.00');
    expect(total.pix.total_com_desconto).toBe('0.00');
    total.cartao_credito.parcelas.forEach((p) => {
      expect(p.valor_parcela).toBe('0.00');
    });
  });
});

describe('buildPaymentOptions — golden path (valores do spec)', () => {
  // IPVA atualizado = 1800.00, MULTA atualizado = 555.93
  const debits: EnrichedDebt[] = [
    makeDebt('IPVA', '1800.00'),
    makeDebt('MULTA', '555.93'),
  ];

  let result: ReturnType<typeof buildPaymentOptions>;
  beforeAll(() => {
    result = buildPaymentOptions(debits);
  });

  it('gera opção TOTAL com valor correto', () => {
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    expect(total.valor_base).toBe('2355.93');
  });

  it('TOTAL — pix com 5% de desconto', () => {
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    expect(total.pix.total_com_desconto).toBe('2238.13');
  });

  it('TOTAL — cartão 1x sem juros', () => {
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    const parcela1x = total.cartao_credito.parcelas.find((p) => p.quantidade === 1)!;
    expect(parcela1x.valor_parcela).toBe('2355.93');
  });

  it('TOTAL — cartão 6x com juros corretos', () => {
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    const parcela6x = total.cartao_credito.parcelas.find((p) => p.quantidade === 6)!;
    expect(parcela6x.valor_parcela).toBe('427.72');
  });

  it('TOTAL — cartão 12x com juros corretos', () => {
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    const parcela12x = total.cartao_credito.parcelas.find((p) => p.quantidade === 12)!;
    expect(parcela12x.valor_parcela).toBe('229.67');
  });

  it('gera opção SOMENTE_IPVA com valor correto', () => {
    const ipva = result.opcoes.find((o) => o.tipo === 'SOMENTE_IPVA')!;
    expect(ipva.valor_base).toBe('1800.00');
    expect(ipva.pix.total_com_desconto).toBe('1710.00');
    expect(ipva.cartao_credito.parcelas.find((p) => p.quantidade === 6)!.valor_parcela).toBe('326.79');
    expect(ipva.cartao_credito.parcelas.find((p) => p.quantidade === 12)!.valor_parcela).toBe('175.48');
  });

  it('gera opção SOMENTE_MULTA com valor correto', () => {
    const multa = result.opcoes.find((o) => o.tipo === 'SOMENTE_MULTA')!;
    expect(multa.valor_base).toBe('555.93');
    expect(multa.pix.total_com_desconto).toBe('528.13');
    expect(multa.cartao_credito.parcelas.find((p) => p.quantidade === 6)!.valor_parcela).toBe('100.93');
    expect(multa.cartao_credito.parcelas.find((p) => p.quantidade === 12)!.valor_parcela).toBe('54.20');
  });

  it('tem exatamente 3 opções (TOTAL + IPVA + MULTA)', () => {
    expect(result.opcoes).toHaveLength(3);
  });
});

describe('buildPaymentOptions — único tipo', () => {
  it('gera somente TOTAL e SOMENTE_IPVA quando há apenas IPVA', () => {
    const result = buildPaymentOptions([makeDebt('IPVA', '500.00')]);
    expect(result.opcoes).toHaveLength(2);
    expect(result.opcoes.map((o) => o.tipo)).toEqual(['TOTAL', 'SOMENTE_IPVA']);
  });
});

describe('buildPaymentOptions — mesmo tipo duplicado', () => {
  it('agrupa dois débitos MULTA na mesma opção SOMENTE_MULTA', () => {
    const result = buildPaymentOptions([
      makeDebt('MULTA', '100.00'),
      makeDebt('MULTA', '200.00'),
    ]);
    expect(result.opcoes).toHaveLength(2);
    const multa = result.opcoes.find((o) => o.tipo === 'SOMENTE_MULTA')!;
    expect(multa.valor_base).toBe('300.00');
  });
});

describe('buildPaymentOptions — estrutura das parcelas', () => {
  it('sempre retorna 3 opções de parcelamento [1, 6, 12]', () => {
    const result = buildPaymentOptions([makeDebt('IPVA', '1000.00')]);
    const total = result.opcoes.find((o) => o.tipo === 'TOTAL')!;
    expect(total.cartao_credito.parcelas.map((p) => p.quantidade)).toEqual([1, 6, 12]);
  });
});
