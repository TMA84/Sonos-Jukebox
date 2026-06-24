import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MediaItemEntity } from './media-item.entity';
import { AlarmEntity } from './alarm.entity';
import { ScheduleEntity } from './schedule.entity';

@Entity('clients')
export class ClientEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  room!: string | null;

  @Column({ type: 'boolean', default: true })
  enableSpeakerSelection!: boolean;

  @Column({ type: 'boolean', default: true })
  enableAlarmClock!: boolean;

  @Column({ type: 'boolean', default: false })
  kioskMode!: boolean;

  @Column({ type: 'boolean', default: false })
  enableContentSearch!: boolean;

  @Column({ type: 'int', default: 0 })
  sleepTimer!: number;

  @Column({ type: 'boolean', default: false })
  autoplayEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  repeatEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => MediaItemEntity, (m) => m.client)
  mediaItems!: MediaItemEntity[];

  @OneToMany(() => AlarmEntity, (a) => a.client)
  alarms!: AlarmEntity[];

  @OneToMany(() => ScheduleEntity, (s) => s.client)
  schedules!: ScheduleEntity[];
}
