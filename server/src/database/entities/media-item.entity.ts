import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from './client.entity';

@Entity('media_items')
export class MediaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, client => client.mediaItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  type: string; // 'album', 'artist', 'playlist', 'radio'

  @Column()
  category: string; // 'audiobook', 'music', 'playlist', 'radio'

  @Column()
  title: string;

  @Column({ nullable: true })
  artist: string;

  @Column({ nullable: true })
  cover: string;

  @Column({ nullable: true })
  spotifyUri: string;

  @Column({ nullable: true })
  spotifyId: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  playCount: number;

  @Column({ nullable: true })
  lastPlayedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
