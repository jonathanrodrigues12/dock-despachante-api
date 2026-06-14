import { ApiProperty } from '@nestjs/swagger';

export class DebtDto {
  @ApiProperty({ example: 'IPVA' })
  type: string;

  @ApiProperty({ example: 1500.0 })
  amount: number;

  @ApiProperty({ example: '2024-01-10' })
  due_date: string;
}
