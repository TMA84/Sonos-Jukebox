import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('config')
export class Config {
  @PrimaryColumn()
  key: string;

  @Column('text')
  value: string;

  @Column({ nullable: true })
  description: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
