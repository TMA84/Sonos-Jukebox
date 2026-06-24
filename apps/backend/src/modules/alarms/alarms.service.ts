import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AlarmEntity } from '../../database/entities/alarm.entity';
import { SonosService } from '../sonos/sonos.service';
import { ClientEntity } from '../../database/entities/client.entity';
import { CreateAlarmDto, UpdateAlarmDto } from './dto/create-alarm.dto';

@Injectable()
export class AlarmsService {
  private readonly logger = new Logger(AlarmsService.name);
  private readonly snoozeOverrides = new Map<string, string>();

  constructor(
    @InjectRepository(AlarmEntity)
    private readonly alarmRepo: Repository<AlarmEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
    private readonly sonosService: SonosService,
  ) {}

  async findByClient(clientId: string): Promise<AlarmEntity[]> {
    return this.alarmRepo.find({ where: { clientId }, order: { time: 'ASC' } });
  }

  async findActive(clientId: string): Promise<AlarmEntity | null> {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentWeekday = now.getDay();

    const snoozeTime = this.snoozeOverrides.get(clientId);
    const timeToCheck = snoozeTime ?? currentTime;

    const alarms = await this.alarmRepo.find({ where: { clientId, enabled: true } });

    const active = alarms.find((alarm) => {
      const timeMatch = alarm.time === timeToCheck;
      const dayMatch = alarm.days.includes(currentWeekday);
      return timeMatch && dayMatch;
    });

    if (snoozeTime && active) {
      this.snoozeOverrides.delete(clientId);
    }

    return active ?? null;
  }

  async create(dto: CreateAlarmDto): Promise<AlarmEntity> {
    const entity = this.alarmRepo.create({
      id: uuidv4(),
      clientId: dto.clientId,
      name: dto.name,
      time: dto.time,
      enabled: dto.enabled ?? true,
      days: dto.days,
      mediaId: dto.mediaId ?? null,
      mediaTitle: dto.mediaTitle ?? null,
      volume: dto.volume ?? 50,
      fadeIn: dto.fadeIn ?? false,
      fadeDuration: dto.fadeDuration ?? 30,
    });

    const saved = await this.alarmRepo.save(entity);
    this.logger.log(`Created alarm "${saved.id}" for client "${dto.clientId}"`);
    return saved;
  }

  async update(id: string, dto: UpdateAlarmDto): Promise<AlarmEntity> {
    const entity = await this.alarmRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Alarm "${id}" not found`);

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.time !== undefined) entity.time = dto.time;
    if (dto.enabled !== undefined) entity.enabled = dto.enabled;
    if (dto.days !== undefined) entity.days = dto.days;
    if (dto.mediaId !== undefined) entity.mediaId = dto.mediaId ?? null;
    if (dto.mediaTitle !== undefined) entity.mediaTitle = dto.mediaTitle ?? null;
    if (dto.volume !== undefined) entity.volume = dto.volume;
    if (dto.fadeIn !== undefined) entity.fadeIn = dto.fadeIn;
    if (dto.fadeDuration !== undefined) entity.fadeDuration = dto.fadeDuration;

    return this.alarmRepo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.alarmRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Alarm "${id}" not found`);
    await this.alarmRepo.remove(entity);
    this.logger.log(`Removed alarm "${id}"`);
  }

  async stop(clientId: string): Promise<void> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (client?.room) {
      await this.sonosService.pause(client.room);
      this.logger.log(`Stopped alarm for client "${clientId}" in room "${client.room}"`);
    }
  }

  async snooze(clientId: string, minutes: number): Promise<void> {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const snoozeTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.snoozeOverrides.set(clientId, snoozeTime);
    await this.stop(clientId);
    this.logger.log(`Snoozed alarm for client "${clientId}" until ${snoozeTime}`);
  }
}
