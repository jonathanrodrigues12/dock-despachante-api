import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { XMLParser } from 'fast-xml-parser';
import { IVehicleDebtsProvider } from '../interfaces/vehicle-debts-provider.interface';
import { VehicleDebtsResponseDto } from '../dto/vehicle-debts-response.dto';
import { DebtDto } from '../dto/debt.dto';

interface ProviderBDebt {
  category: string;
  value: number;
  expiration: string;
}

interface ProviderBResponse {
  plate: string;
  debts: { debt: ProviderBDebt | ProviderBDebt[] } | '';
}

@Injectable()
export class MockProviderBService implements IVehicleDebtsProvider {
  private readonly records: ProviderBResponse[];

  constructor() {
    const xmlPath = join(__dirname, '..', 'mocks', 'provider-b.mock.xml');
    const xml = readFileSync(xmlPath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    // Garante array mesmo com uma única <response>
    this.records = [].concat(parsed.vehicles.response);
  }

  async getDebts(plate: string): Promise<VehicleDebtsResponseDto | null> {
    const record = this.records.find(
      (r) => String(r.plate).toUpperCase() === plate.toUpperCase(),
    );
    if (!record) return null;

    const debtNode = record.debts !== '' && record.debts
      ? (record.debts as { debt: ProviderBDebt | ProviderBDebt[] }).debt
      : undefined;

    const rawDebts: ProviderBDebt[] = debtNode
      ? Array.isArray(debtNode) ? debtNode : [debtNode]
      : [];

    const debts: DebtDto[] = rawDebts.map((d: ProviderBDebt) => ({
      type: d.category,
      amount: Number(d.value),
      due_date: d.expiration,
    }));

    return { vehicle: String(record.plate), debts };
  }
}
