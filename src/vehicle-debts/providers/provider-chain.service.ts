import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  IVehicleDebtsProvider,
  VEHICLE_DEBTS_PROVIDERS,
  ProviderResult,
} from '../interfaces/vehicle-debts-provider.interface';

function maskPlate(plate: string): string {
  if (plate.length < 4) return '***';
  return plate.slice(0, 2) + '***' + plate.slice(-2);
}

@Injectable()
export class ProviderChainService implements IVehicleDebtsProvider {
  private readonly logger = new Logger(ProviderChainService.name);

  constructor(
    @Inject(VEHICLE_DEBTS_PROVIDERS)
    private readonly providers: IVehicleDebtsProvider[],
  ) {}

  async getDebts(plate: string): Promise<ProviderResult | null> {
    const masked = maskPlate(plate);

    for (let i = 0; i < this.providers.length; i++) {
      try {
        this.logger.log(`Trying provider ${i + 1} for plate ${masked}`);
        const result = await this.providers[i].getDebts(plate);
        if (result !== null) {
          this.logger.log(`Provider ${i + 1} succeeded for plate ${masked}`);
        }
        return result;
      } catch (err) {
        this.logger.warn(
          `Provider ${i + 1} failed for plate ${masked}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.error(`All providers failed for plate ${masked}`);
    throw new ServiceUnavailableException({ error: 'all_providers_unavailable' });
  }
}
