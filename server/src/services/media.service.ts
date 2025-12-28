import { AppDataSource } from '../database/data-source';
import { MediaItem } from '../database/entities/media-item.entity';
import { AppError } from '../middleware/error-handler';

export interface CreateMediaItemDto {
  clientId: string;
  type: string;
  category: string;
  title: string;
  artist?: string;
  cover?: string;
  spotifyUri?: string;
  spotifyId?: string;
  metadata?: Record<string, any>;
}

export class MediaService {
  private mediaRepository = AppDataSource.getRepository(MediaItem);

  async createMediaItem(dto: CreateMediaItemDto): Promise<MediaItem> {
    const mediaItem = this.mediaRepository.create(dto);
    return await this.mediaRepository.save(mediaItem);
  }

  async getMediaItems(clientId: string, category?: string): Promise<MediaItem[]> {
    const where: any = { clientId };
    if (category) {
      where.category = category;
    }

    return await this.mediaRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getMediaItem(id: string): Promise<MediaItem> {
    const item = await this.mediaRepository.findOne({ where: { id } });
    if (!item) {
      throw new AppError(404, 'Media item not found');
    }
    return item;
  }

  async deleteMediaItem(id: string, clientId: string): Promise<void> {
    const item = await this.mediaRepository.findOne({ where: { id, clientId } });
    if (!item) {
      throw new AppError(404, 'Media item not found');
    }
    await this.mediaRepository.remove(item);
  }

  async incrementPlayCount(id: string): Promise<void> {
    await this.mediaRepository.update(id, {
      playCount: () => 'playCount + 1',
      lastPlayedAt: new Date(),
    });
  }

  async getPopularItems(clientId: string, limit = 10): Promise<MediaItem[]> {
    return await this.mediaRepository.find({
      where: { clientId },
      order: { playCount: 'DESC' },
      take: limit,
    });
  }
}
