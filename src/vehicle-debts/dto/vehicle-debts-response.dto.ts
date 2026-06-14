import { ApiProperty } from '@nestjs/swagger';

export class EnrichedDebtDto {
  @ApiProperty({ example: 'IPVA' }) tipo: string;
  @ApiProperty({ example: '1500.00' }) valor_original: string;
  @ApiProperty({ example: '1800.00' }) valor_atualizado: string;
  @ApiProperty({ example: '2024-01-10' }) vencimento: string;
  @ApiProperty({ example: 121 }) dias_atraso: number;
}

export class SummaryDto {
  @ApiProperty({ example: '1800.50' }) total_original: string;
  @ApiProperty({ example: '2355.93' }) total_atualizado: string;
}

export class PixDto {
  @ApiProperty({ example: '2238.13' }) total_com_desconto: string;
}

export class InstallmentDto {
  @ApiProperty({ example: 6 }) quantidade: number;
  @ApiProperty({ example: '427.72' }) valor_parcela: string;
}

export class CreditCardDto {
  @ApiProperty({ type: [InstallmentDto] }) parcelas: InstallmentDto[];
}

export class PaymentOptionDto {
  @ApiProperty({ example: 'TOTAL' }) tipo: string;
  @ApiProperty({ example: '2355.93' }) valor_base: string;
  @ApiProperty({ type: PixDto }) pix: PixDto;
  @ApiProperty({ type: CreditCardDto }) cartao_credito: CreditCardDto;
}

export class PaymentsDto {
  @ApiProperty({ type: [PaymentOptionDto] }) opcoes: PaymentOptionDto[];
}

export class VehicleDebtsResponseDto {
  @ApiProperty({ example: 'ABC1234' }) placa: string;
  @ApiProperty({ example: 'A', enum: ['A', 'B'] }) provedor: 'A' | 'B';
  @ApiProperty({ type: [EnrichedDebtDto] }) debitos: EnrichedDebtDto[];
  @ApiProperty({ type: SummaryDto }) resumo: SummaryDto;
  @ApiProperty({ type: PaymentsDto }) pagamentos: PaymentsDto;
}
