import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleEntity } from '../../database/entities/schedule.entity';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
  ) {}

  async findByClient(clientId: string): Promise<ScheduleEntity[]> {
    return this.scheduleRepo.find({ where: { clientId } });
  }

  async getBlockedCategories(clientId: string): Promise<string[]> {
    const schedules = await this.scheduleRepo.find({ where: { clientId, enabled: true } });

    if (schedules.length === 0) {
      return [];
    }

    const now = new Date();
    const currentWeekday = now.getDay();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    const allowedCategories = new Set<string>();

    for (const schedule of schedules) {
      const dayMatch = schedule.days.includes(currentWeekday);
      if (!dayMatch) continue;

      const inWindow = this.isTimeInWindow(currentTime, schedule.startTime, schedule.endTime);
      if (inWindow) {
        allowedCategories.add(schedule.category);
      }
    }

    const scheduledCategories = [...new Set(schedules.map((s) => s.category))];
    return scheduledCategories.filter((category) => !allowedCategories.has(category));
  }

  private isTimeInWindow(current: string, start: string, end: string): boolean {
    if (start <= end) {
      return current >= start && current <= end;
    }
    return current >= start || current <= end;
  }

  async create(dto: CreateScheduleDto): Promise<ScheduleEntity> {
    const entity = this.scheduleRepo.create({
      id: uuidv4(),
      clientId: dto.clientId,
      category: dto.category,
      startTime: dto.startTime,
      endTime: dto.endTime,
      days: dto.days,
      enabled: dto.enabled ?? true,
    });

    const saved = await this.scheduleRepo.save(entity);
    this.logger.log(`Created schedule "${saved.id}" for client "${dto.clientId}"`);
    return saved;
  }

  async update(id: string, dto: UpdateScheduleDto): Promise<ScheduleEntity> {
    const entity = await this.scheduleRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Schedule "${id}" not found`);

    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.startTime !== undefined) entity.startTime = dto.startTime;
    if (dto.endTime !== undefined) entity.endTime = dto.endTime;
    if (dto.days !== undefined) entity.days = dto.days;
    if (dto.enabled !== undefined) entity.enabled = dto.enabled;

    return this.scheduleRepo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.scheduleRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Schedule "${id}" not found`);
    await this.scheduleRepo.remove(entity);
    this.logger.log(`Removed schedule "${id}"`);
  }
}
