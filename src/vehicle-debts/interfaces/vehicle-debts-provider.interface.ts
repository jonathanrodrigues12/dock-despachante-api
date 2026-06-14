import { VehicleDebtsResponseDto } from '../dto/vehicle-debts-response.dto';

export const VEHICLE_DEBTS_PROVIDER = 'VEHICLE_DEBTS_PROVIDER';

export interface IVehicleDebtsProvider {
  getDebts(plate: string): Promise<VehicleDebtsResponseDto | null>;
}
