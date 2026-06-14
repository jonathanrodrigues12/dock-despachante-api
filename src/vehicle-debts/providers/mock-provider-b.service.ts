import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { XMLParser } from 'fast-xml-parser';
import { IVehicleDebtsProvider, ProviderResult } from '../interfaces/vehicle-debts-provider.interface';

interface XmlDebt {
  category: string;
  value: number;
  expiration: string;
}

interface XmlResponse {
  plate: string;
  debts: { debt: XmlDebt | XmlDebt[] } | '';
}

@Injectable()
export class MockProviderBService implements IVehicleDebtsProvider {
  private readonly records: XmlResponse[];

  constructor() {
    const xmlPath = join(__dirname, '..', 'mocks', 'provider-b.mock.xml');
    const xml = readFileSync(xmlPath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    this.records = [].concat(parsed.vehicles.response);
  }

  async getDebts(plate: string): Promise<ProviderResult | null> {
    if (process.env.SIMULATE_PROVIDER_B_FAILURE === 'true') {
      throw new ServiceUnavailableException('Provider B simulated failure');
    }

    const record = this.records.find(
      (r) => String(r.plate).toUpperCase() === plate.toUpperCase(),
    );
    if (!record) return null;

    const debtNode =
      record.debts !== '' && record.debts
        ? (record.debts as { debt: XmlDebt | XmlDebt[] }).debt
        : undefined;

    const rawDebts: XmlDebt[] = debtNode
      ? Array.isArray(debtNode)
        ? debtNode
        : [debtNode]
      : [];

    return {
      plate: String(record.plate),
      provider: 'B',
      debts: rawDebts.map((d) => ({
        type: d.category,
        amount: Number(d.value),
        due_date: d.expiration,
      })),
    };
  }
}
