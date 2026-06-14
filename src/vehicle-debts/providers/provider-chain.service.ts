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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CircuitState {
  failures: number;
  openedAt: number | null;
}

@Injectable()
export class ProviderChainService implements IVehicleDebtsProvider {
  private readonly logger = new Logger(ProviderChainService.name);
  private readonly circuits: CircuitState[];

  private get maxRetries(): number {
    return parseInt(process.env.PROVIDER_RETRY_ATTEMPTS ?? '2', 10);
  }

  private get retryBaseDelayMs(): number {
    return parseInt(process.env.PROVIDER_RETRY_DELAY_MS ?? '200', 10);
  }

  private get cbThreshold(): number {
    return parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? '3', 10);
  }

  private get cbCooldownMs(): number {
    return parseInt(process.env.CIRCUIT_BREAKER_COOLDOWN_MS ?? '30000', 10);
  }

  constructor(
    @Inject(VEHICLE_DEBTS_PROVIDERS)
    private readonly providers: IVehicleDebtsProvider[],
  ) {
    this.circuits = providers.map(() => ({ failures: 0, openedAt: null }));
  }

  private isOpen(state: CircuitState): boolean {
    if (state.openedAt === null) return false;
    return Date.now() - state.openedAt < this.cbCooldownMs;
  }

  private onSuccess(state: CircuitState): void {
    state.failures = 0;
    state.openedAt = null;
  }

  private onFailure(state: CircuitState): void {
    state.failures += 1;
    if (state.failures >= this.cbThreshold) {
      state.openedAt = Date.now();
    }
  }

  private async withRetry(
    fn: () => Promise<ProviderResult | null>,
    providerIndex: number,
    masked: string,
  ): Promise<ProviderResult | null> {
    let lastError: Error = new Error('unknown');

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          const delay = this.retryBaseDelayMs * 2 ** attempt;
          this.logger.warn(
            `Provider ${providerIndex + 1} attempt ${attempt + 1} failed for ${masked} — retrying in ${delay}ms`,
          );
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  async getDebts(plate: string): Promise<ProviderResult | null> {
    const masked = maskPlate(plate);

    for (let i = 0; i < this.providers.length; i++) {
      const state = this.circuits[i];

      if (this.isOpen(state)) {
        this.logger.warn(`Provider ${i + 1} circuit OPEN — skipping (${masked})`);
        continue;
      }

      try {
        this.logger.log(`Trying provider ${i + 1} for plate ${masked}`);
        const result = await this.withRetry(() => this.providers[i].getDebts(plate), i, masked);

        this.onSuccess(state);
        if (result !== null) {
          this.logger.log(`Provider ${i + 1} succeeded for plate ${masked}`);
        }
        return result;
      } catch (err) {
        this.onFailure(state);
        const open = this.isOpen(state);
        this.logger.warn(
          `Provider ${i + 1} failed for plate ${masked}: ${(err as Error).message}` +
            (open ? ' — circuit OPENED' : ` (${state.failures}/${this.cbThreshold} failures)`),
        );
      }
    }

    this.logger.error(`All providers failed for plate ${masked}`);
    throw new ServiceUnavailableException({ error: 'all_providers_unavailable' });
  }
}
