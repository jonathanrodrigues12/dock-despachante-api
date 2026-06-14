import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProviderChainService } from './providers/provider-chain.service';
import { VehicleDebtsResponseDto } from './dto/vehicle-debts-response.dto';
import { enrichDebts, roundHalfUp } from './domain/interest.calculator';
import { buildPaymentOptions } from './domain/payment.calculator';

@Injectable()
export class VehicleDebtsService {
  private readonly logger = new Logger(VehicleDebtsService.name);

  constructor(private readonly chain: ProviderChainService) {}

  async getDebtsByPlate(plate: string): Promise<VehicleDebtsResponseDto> {
    const refDate = process.env.REFERENCE_DATE
      ? new Date(process.env.REFERENCE_DATE)
      : new Date();

    const result = await this.chain.getDebts(plate);

    if (!result) {
      throw new NotFoundException({ error: 'plate_not_found', plate });
    }

    const debitos = enrichDebts(result.debts, refDate);

    const totalOriginal = result.debts.reduce((s, d) => s + d.amount, 0);
    const totalAtualizado = debitos.reduce((s, d) => s + Number(d.valor_atualizado), 0);

    this.logger.log(`Debts calculated for ${plate}: ${debitos.length} item(s)`);

    return {
      placa: result.plate,
      provedor: result.provider,
      debitos,
      resumo: {
        total_original: roundHalfUp(totalOriginal, 2).toFixed(2),
        total_atualizado: roundHalfUp(totalAtualizado, 2).toFixed(2),
      },
      pagamentos: buildPaymentOptions(debitos),
    };
  }
}
