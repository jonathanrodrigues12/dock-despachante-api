import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IVehicleDebtsProvider,
  VEHICLE_DEBTS_PROVIDER,
} from './interfaces/vehicle-debts-provider.interface';
import { VehicleDebtsResponseDto } from './dto/vehicle-debts-response.dto';

@Injectable()
export class VehicleDebtsService {
  constructor(
    @Inject(VEHICLE_DEBTS_PROVIDER)
    private readonly provider: IVehicleDebtsProvider,
  ) {}

  async getDebtsByPlate(plate: string): Promise<VehicleDebtsResponseDto> {
    const result = await this.provider.getDebts(plate);
    if (!result) {
      throw new NotFoundException(`Nenhum registro encontrado para a placa ${plate}`);
    }
    return result;
  }
}
