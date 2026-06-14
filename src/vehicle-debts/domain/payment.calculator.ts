import { EnrichedDebt, roundHalfUp } from './interest.calculator';

const PIX_DISCOUNT = 0.05;
const CC_RATE = 0.025;
const CC_INSTALLMENTS = [1, 6, 12] as const;

function pmt(base: number, rate: number, n: number): number {
  const factor = (1 + rate) ** n;
  return (base * rate * factor) / (factor - 1);
}

function buildOption(tipo: string, base: number) {
  return {
    tipo,
    valor_base: base.toFixed(2),
    pix: {
      total_com_desconto: roundHalfUp(base * (1 - PIX_DISCOUNT), 2).toFixed(2),
    },
    cartao_credito: {
      parcelas: CC_INSTALLMENTS.map((n) => ({
        quantidade: n,
        valor_parcela:
          n === 1
            ? base.toFixed(2)
            : roundHalfUp(pmt(base, CC_RATE, n), 2).toFixed(2),
      })),
    },
  };
}

export function buildPaymentOptions(debits: EnrichedDebt[]) {
  const total = debits.reduce((sum, d) => sum + Number(d.valor_atualizado), 0);

  const byType = debits.reduce<Record<string, number>>((acc, d) => {
    acc[d.tipo] = roundHalfUp((acc[d.tipo] ?? 0) + Number(d.valor_atualizado), 2);
    return acc;
  }, {});

  const opcoes = [buildOption('TOTAL', roundHalfUp(total, 2))];

  for (const [tipo, subtotal] of Object.entries(byType)) {
    opcoes.push(buildOption(`SOMENTE_${tipo}`, subtotal));
  }

  return { opcoes };
}
