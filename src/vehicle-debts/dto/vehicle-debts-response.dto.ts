import { ApiProperty } from '@nestjs/swagger';

export class EnrichedDebtDto {
  @ApiProperty({ example: 'IPVA' }) tipo: string;
  @ApiProperty({ example: '1500.00' }) valor_original: string;
  @ApiProperty({ example: '1800.00' }) valor_atualizado: string;
  @ApiProperty({ example: '2024-01-10' }) vencimento: string;
  @ApiProperty({ example: 121 }) dias_atraso: number;
}

export class ResumoDto {
  @ApiProperty({ example: '1800.50' }) total_original: string;
  @ApiProperty({ example: '2355.93' }) total_atualizado: string;
}

export class PixDto {
  @ApiProperty({ example: '2238.13' }) total_com_desconto: string;
}

export class ParcelaDto {
  @ApiProperty({ example: 6 }) quantidade: number;
  @ApiProperty({ example: '427.72' }) valor_parcela: string;
}

export class CartaoCreditoDto {
  @ApiProperty({ type: [ParcelaDto] }) parcelas: ParcelaDto[];
}

export class PaymentOptionDto {
  @ApiProperty({ example: 'TOTAL' }) tipo: string;
  @ApiProperty({ example: '2355.93' }) valor_base: string;
  @ApiProperty({ type: PixDto }) pix: PixDto;
  @ApiProperty({ type: CartaoCreditoDto }) cartao_credito: CartaoCreditoDto;
}

export class PagamentosDto {
  @ApiProperty({ type: [PaymentOptionDto] }) opcoes: PaymentOptionDto[];
}

export class VehicleDebtsResponseDto {
  @ApiProperty({ example: 'ABC1234' }) placa: string;
  @ApiProperty({ type: [EnrichedDebtDto] }) debitos: EnrichedDebtDto[];
  @ApiProperty({ type: ResumoDto }) resumo: ResumoDto;
  @ApiProperty({ type: PagamentosDto }) pagamentos: PagamentosDto;
}
