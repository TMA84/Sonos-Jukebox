import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MediaItemEntity } from '../../database/entities/media-item.entity';
import { CreateMediaDto, UpdateMediaDto } from './dto/create-media.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,
  ) {}

  async findByClient(clientId: string, category?: string): Promise<MediaItemEntity[]> {
    const where: Record<string, unknown> = { clientId };
    if (category) {
      where['category'] = category;
    }
    return this.mediaRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateMediaDto): Promise<MediaItemEntity> {
    if (dto.id) {
      const existing = await this.mediaRepo.findOne({ where: { id: dto.id, clientId: dto.clientId } });
      if (existing) {
        return existing;
      }
    }

    const id = dto.id || dto.spotifyId || uuidv4();
    const entity = this.mediaRepo.create({
      id,
      clientId: dto.clientId,
      title: dto.title,
      artist: dto.artist,
      cover: dto.cover ?? null,
      type: dto.type ?? null,
      category: dto.category,
      contentType: dto.contentType ?? null,
      spotifyUri: dto.spotifyUri ?? null,
      spotifyId: dto.spotifyId ?? null,
      artistId: dto.artistId ?? null,
      metadata: dto.metadata ?? null,
    });

    const saved = await this.mediaRepo.save(entity);
    this.logger.log(`Created media item "${saved.id}" for client "${dto.clientId}"`);
    return saved;
  }

  async update(id: string, clientId: string, dto: UpdateMediaDto): Promise<MediaItemEntity> {
    const entity = await this.mediaRepo.findOne({ where: { id, clientId } });
    if (!entity) throw new NotFoundException(`Media item "${id}" not found for client "${clientId}"`);

    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.artist !== undefined) entity.artist = dto.artist;
    if (dto.cover !== undefined) entity.cover = dto.cover ?? null;
    if (dto.type !== undefined) entity.type = dto.type ?? null;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.contentType !== undefined) entity.contentType = dto.contentType ?? null;
    if (dto.spotifyUri !== undefined) entity.spotifyUri = dto.spotifyUri ?? null;
    if (dto.spotifyId !== undefined) entity.spotifyId = dto.spotifyId ?? null;
    if (dto.artistId !== undefined) entity.artistId = dto.artistId ?? null;
    if (dto.metadata !== undefined) entity.metadata = dto.metadata ?? null;

    return this.mediaRepo.save(entity);
  }

  async remove(id: string, clientId: string): Promise<void> {
    const entity = await this.mediaRepo.findOne({ where: { id, clientId } });
    if (!entity) throw new NotFoundException(`Media item "${id}" not found for client "${clientId}"`);
    await this.mediaRepo.remove(entity);
    this.logger.log(`Removed media item "${id}" for client "${clientId}"`);
  }
}
