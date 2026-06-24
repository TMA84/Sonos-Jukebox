import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ClientEntity } from '../../database/entities/client.entity';
import { Client, ClientSettings } from '@sonos-jukebox/shared';
import { CreateClientDto, UpdateClientDto, UpdateClientSettingsDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
  ) {}

  async findAll(): Promise<Client[]> {
    const entities = await this.clientRepo.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
    return entities.map(this.toClient);
  }

  async findOne(id: string): Promise<Client> {
    const entity = await this.clientRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Client "${id}" not found`);
    return this.toClient(entity);
  }

  async getSettings(id: string): Promise<ClientSettings> {
    const entity = await this.clientRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Client "${id}" not found`);
    return this.toSettings(entity);
  }

  async create(dto: CreateClientDto): Promise<Client> {
    const entity = this.clientRepo.create({ id: uuidv4(), name: dto.name, room: dto.room ?? null });
    const saved = await this.clientRepo.save(entity);
    return this.toClient(saved);
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const entity = await this.clientRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Client "${id}" not found`);
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.room !== undefined) entity.room = dto.room ?? null;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    const saved = await this.clientRepo.save(entity);
    return this.toClient(saved);
  }

  async updateSettings(id: string, dto: UpdateClientSettingsDto): Promise<ClientSettings> {
    const entity = await this.clientRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Client "${id}" not found`);
    Object.assign(entity, dto);
    const saved = await this.clientRepo.save(entity);
    return this.toSettings(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.clientRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Client "${id}" not found`);
    entity.isActive = false;
    await this.clientRepo.save(entity);
  }

  private toClient(e: ClientEntity): Client {
    return { id: e.id, name: e.name, isActive: e.isActive, createdAt: e.createdAt, updatedAt: e.updatedAt };
  }

  private toSettings(e: ClientEntity): ClientSettings {
    return {
      room: e.room,
      sleepTimer: e.sleepTimer,
      enableSpeakerSelection: e.enableSpeakerSelection,
      enableAlarmClock: e.enableAlarmClock,
      kioskMode: e.kioskMode,
      enableContentSearch: e.enableContentSearch,
      autoplayEnabled: e.autoplayEnabled,
      repeatEnabled: e.repeatEnabled,
    };
  }
}
