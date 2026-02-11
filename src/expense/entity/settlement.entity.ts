import { Group } from '../../group/entity/group.entity';
import { User } from '../../user/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../enums/payment-method.enum';

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  group_id: string;

  @Column({ type: 'uuid' })
  payer_id: string;

  @Column({ type: 'uuid' })
  payee_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  payment_method: PaymentMethod;

  @Column({ type: 'timestamp', nullable: true })
  settled_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payer_id' })
  payer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payee_id' })
  payee: User;
}
