import { UnprocessableEntityException } from '@nestjs/common';

export interface RawDebt {
  type: string;
  amount: number;
  due_date: string;
}

export interface EnrichedDebt {
  tipo: string;
  valor_original: string;
  valor_atualizado: string;
  vencimento: string;
  dias_atraso: number;
}

export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function diffDays(dueDateStr: string, refDate: Date): number {
  const due = new Date(dueDateStr + 'T00:00:00Z');
  return Math.floor((refDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function getEnvRate(key: string, fallback: number): number {
  const val = parseFloat(process.env[key] ?? '');
  return isNaN(val) ? fallback : val;
}

const INTEREST_RULES: Record<string, (amount: number, days: number) => number> = {
  IPVA: (amount, days) => {
    const rate = getEnvRate('IPVA_DAILY_RATE', 0.0033);
    const cap = getEnvRate('IPVA_MAX_RATE', 0.20);
    return Math.min(amount * rate * days, amount * cap);
  },
  LICENCIAMENTO: (amount, days) => {
    const rate = getEnvRate('IPVA_DAILY_RATE', 0.0033);
    const cap = getEnvRate('IPVA_MAX_RATE', 0.20);
    return Math.min(amount * rate * days, amount * cap);
  },
  MULTA: (amount, days) => {
    const rate = getEnvRate('MULTA_DAILY_RATE', 0.01);
    return amount * rate * days;
  },
};

function calcInterest(amount: number, daysLate: number, type: string): number {
  if (daysLate <= 0) return 0;

  const rule = INTEREST_RULES[type];
  if (!rule) {
    throw new UnprocessableEntityException({ error: 'unknown_debt_type', type });
  }

  return rule(amount, daysLate);
}

export function enrichDebts(rawDebts: RawDebt[], refDate: Date): EnrichedDebt[] {
  return rawDebts.map((debt) => {
    const daysLate = diffDays(debt.due_date, refDate);
    const interest = roundHalfUp(calcInterest(debt.amount, daysLate, debt.type), 2);
    const updated = roundHalfUp(debt.amount + interest, 2);

    return {
      tipo: debt.type,
      valor_original: debt.amount.toFixed(2),
      valor_atualizado: updated.toFixed(2),
      vencimento: debt.due_date,
      dias_atraso: Math.max(daysLate, 0),
    };
  });
}
