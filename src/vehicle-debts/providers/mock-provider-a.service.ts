import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IVehicleDebtsProvider, ProviderResult } from '../interfaces/vehicle-debts-provider.interface';
import mockData from '../mocks/provider-a.mock.json';

interface MockRecord {
  vehicle: string;
  debts: { type: string; amount: number; due_date: string }[];
}

@Injectable()
export class MockProviderAService implements IVehicleDebtsProvider {
  async getDebts(plate: string): Promise<ProviderResult | null> {
    if (process.env.SIMULATE_PROVIDER_A_FAILURE === 'true') {
      throw new ServiceUnavailableException('Provider A simulated failure');
    }

    const record = (mockData as MockRecord[]).find(
      (r) => r.vehicle.toUpperCase() === plate.toUpperCase(),
    );

    if (!record) return null;

    return {
      plate: record.vehicle,
      debts: record.debts.map((d) => ({
        type: d.type,
        amount: d.amount,
        due_date: d.due_date,
      })),
    };
  }
}
