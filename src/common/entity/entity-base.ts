import { User } from '@/users/users.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class EntityBase {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @ApiProperty()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedBy?: User;
}
