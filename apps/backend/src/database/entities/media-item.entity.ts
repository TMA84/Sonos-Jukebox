import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClientEntity } from './client.entity';

@Entity('media_items')
export class MediaItemEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @PrimaryColumn({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  artist!: string;

  @Column({ type: 'varchar', nullable: true })
  cover!: string | null;

  @Column({ type: 'varchar', nullable: true })
  type!: string | null;

  @Column({ type: 'varchar' })
  category!: string;

  @Column({ type: 'varchar', nullable: true })
  contentType!: string | null;

  @Column({ type: 'varchar', nullable: true })
  spotifyUri!: string | null;

  @Column({ type: 'varchar', nullable: true })
  spotifyId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  artistId!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ClientEntity, (c) => c.mediaItems)
  @JoinColumn({ name: 'clientId' })
  client!: ClientEntity;
}
