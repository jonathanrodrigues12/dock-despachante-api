import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CodeValidation } from '../code-validations/code-validation.entity';
import { Exclude } from 'class-transformer';
import { Role } from '../common/entity/rolebase';
import { AuthProvider } from '../common/enums/provider.enum';
import { ApiProperty } from '@nestjs/swagger';
@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 255 })
  name: string;

  @ApiProperty()
  @Column({ length: 255 })
  surname: string;

  @ApiProperty({
    required: false,
  })
  @Column({ nullable: true })
  photo_url?: string;

  @ApiProperty()
  @Column({ length: 255, unique: true })
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @ApiProperty({ default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ enum: Role })
  @Column()
  role: Role;

  @ApiProperty({ enum: AuthProvider, default: AuthProvider.LOCAL })
  @Column({ type: 'varchar', nullable: true })
  provider: AuthProvider;

  @ApiProperty({ default: false })
  @Column({ default: false })
  mfaEnabled: boolean;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', nullable: true })
  mfaSecret?: string;

  @ApiProperty({ required: false })
  @OneToMany(() => CodeValidation, (codeValidation) => codeValidation.user)
  codeValidations: CodeValidation[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ApiProperty()
  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at?: Date;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by?: User;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updated_by?: User;

  @Exclude()
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deleted_by?: User;
}
