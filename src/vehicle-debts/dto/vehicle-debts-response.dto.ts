import { ApiProperty } from '@nestjs/swagger';
import { DebtDto } from './debt.dto';

export class VehicleDebtsResponseDto {
  @ApiProperty({ example: 'ABC1234' })
  vehicle: string;

  @ApiProperty({ type: [DebtDto] })
  debts: DebtDto[];
}
