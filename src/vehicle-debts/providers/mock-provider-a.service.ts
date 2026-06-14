import { Injectable } from '@nestjs/common';
import { IVehicleDebtsProvider } from '../interfaces/vehicle-debts-provider.interface';
import { VehicleDebtsResponseDto } from '../dto/vehicle-debts-response.dto';
import * as mockData from '../mocks/provider-a.mock.json';

@Injectable()
export class MockProviderAService implements IVehicleDebtsProvider {
  async getDebts(plate: string): Promise<VehicleDebtsResponseDto | null> {
    const record = (mockData as VehicleDebtsResponseDto[]).find(
      (entry) => entry.vehicle.toUpperCase() === plate.toUpperCase(),
    );
    return record ?? null;
  }
}
