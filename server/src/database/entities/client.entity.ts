import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MediaItem } from './media-item.entity';

@Entity('clients')
export class Client {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  room: string;

  @Column({ default: true })
  enableSpeakerSelection: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => MediaItem, mediaItem => mediaItem.client)
  mediaItems: MediaItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
