import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClientEntity } from './client.entity';

@Entity('schedules')
export class ScheduleEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  category!: string;

  @Column({ type: 'varchar' })
  startTime!: string;

  @Column({ type: 'varchar' })
  endTime!: string;

  @Column({ type: 'simple-json' })
  days!: number[];

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ClientEntity, (c) => c.schedules)
  @JoinColumn({ name: 'clientId' })
  client!: ClientEntity;
}
