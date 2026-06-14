import { ApiProperty } from '@nestjs/swagger';
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class TimestampEntityBase {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ApiProperty()
  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at?: Date;
}
