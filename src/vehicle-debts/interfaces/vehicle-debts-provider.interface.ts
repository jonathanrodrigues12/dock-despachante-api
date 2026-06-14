export const VEHICLE_DEBTS_PROVIDERS = 'VEHICLE_DEBTS_PROVIDERS';

export interface RawDebtRecord {
  type: string;
  amount: number;
  due_date: string;
}

export interface ProviderResult {
  plate: string;
  debts: RawDebtRecord[];
}

export interface IVehicleDebtsProvider {
  getDebts(plate: string): Promise<ProviderResult | null>;
}
