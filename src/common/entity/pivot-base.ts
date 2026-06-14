import { ApiProperty } from '@nestjs/swagger';
import { PrimaryGeneratedColumn } from 'typeorm';

export class PivotBase {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
