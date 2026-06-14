import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/users.entity';
@Entity('code_validations')
export class CodeValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column({ default: false })
  isFirst: boolean;

  @Column({ type: Date })
  expiresIn: Date;

  @ManyToOne(() => User, (user) => user.codeValidations)
  @JoinColumn()
  user: User;
}
