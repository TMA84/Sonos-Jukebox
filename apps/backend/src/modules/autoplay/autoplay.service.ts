import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../../database/entities/client.entity';
import { MediaItemEntity } from '../../database/entities/media-item.entity';

export interface AutoplaySettings {
  autoplayEnabled: boolean;
  repeatEnabled: boolean;
}

@Injectable()
export class AutoplayService {
  private readonly logger = new Logger(AutoplayService.name);

  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,
  ) {}

  async getSettings(clientId: string): Promise<AutoplaySettings> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException(`Client "${clientId}" not found`);
    return { autoplayEnabled: client.autoplayEnabled, repeatEnabled: client.repeatEnabled };
  }

  async updateSettings(clientId: string, dto: Partial<AutoplaySettings>): Promise<AutoplaySettings> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException(`Client "${clientId}" not found`);

    if (dto.autoplayEnabled !== undefined) client.autoplayEnabled = dto.autoplayEnabled;
    if (dto.repeatEnabled !== undefined) client.repeatEnabled = dto.repeatEnabled;

    const saved = await this.clientRepo.save(client);
    this.logger.log(`Updated autoplay settings for client "${clientId}"`);
    return { autoplayEnabled: saved.autoplayEnabled, repeatEnabled: saved.repeatEnabled };
  }

  async getQueue(clientId: string): Promise<MediaItemEntity[]> {
    return this.mediaRepo.find({ where: { clientId }, order: { createdAt: 'DESC' } });
  }

  async playNext(clientId: string): Promise<MediaItemEntity | null> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException(`Client "${clientId}" not found`);

    if (!client.autoplayEnabled) {
      return null;
    }

    const items = await this.mediaRepo.find({ where: { clientId } });
    if (items.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * items.length);
    const next = items[randomIndex] ?? null;
    this.logger.log(`Autoplay next for client "${clientId}": "${next?.title}"`);
    return next;
  }
}
