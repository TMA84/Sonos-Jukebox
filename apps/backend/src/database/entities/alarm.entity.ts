import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClientEntity } from './client.entity';

@Entity('alarms')
export class AlarmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  time!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'simple-json' })
  days!: number[];

  @Column({ type: 'varchar', nullable: true })
  mediaId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaTitle!: string | null;

  @Column({ type: 'int', default: 50 })
  volume!: number;

  @Column({ type: 'boolean', default: false })
  fadeIn!: boolean;

  @Column({ type: 'int', default: 30 })
  fadeDuration!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ClientEntity, (c) => c.alarms)
  @JoinColumn({ name: 'clientId' })
  client!: ClientEntity;
}
