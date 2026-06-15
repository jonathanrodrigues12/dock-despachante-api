import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { IVehicleDebtsProvider, ProviderResult } from '../interfaces/vehicle-debts-provider.interface';

interface CsvRow {
  plate: string;
  debt_type: string;
  amount: string;
  due_date: string;
}

@Injectable()
export class MockProviderCService implements IVehicleDebtsProvider {
  private readonly rows: CsvRow[];

  constructor() {
    const csvPath = join(__dirname, '..', 'mocks', 'provider-c.mock.csv');
    const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');
    const [, ...dataLines] = lines;
    this.rows = dataLines.map((line) => {
      const [plate, debt_type, amount, due_date] = line.split(',');
      return { plate: plate.trim(), debt_type: debt_type.trim(), amount: amount.trim(), due_date: due_date.trim() };
    });
  }

  async getDebts(plate: string): Promise<ProviderResult | null> {
    if (process.env.SIMULATE_PROVIDER_C_FAILURE === 'true') {
      throw new ServiceUnavailableException('Provider C simulated failure');
    }

    const matched = this.rows.filter(
      (r) => r.plate.toUpperCase() === plate.toUpperCase(),
    );

    if (!matched.length) return null;

    const debts = matched
      .filter((r) => r.debt_type && r.amount)
      .map((r) => ({
        type: r.debt_type,
        amount: Number(r.amount),
        due_date: r.due_date,
      }));

    return {
      plate: matched[0].plate,
      provider: 'C',
      debts,
    };
  }
}
