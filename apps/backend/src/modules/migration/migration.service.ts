import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as BetterSqlite3 from 'better-sqlite3';
import { ClientEntity } from '../../database/entities/client.entity';
import { MediaItemEntity } from '../../database/entities/media-item.entity';
import { AlarmEntity } from '../../database/entities/alarm.entity';
import { ScheduleEntity } from '../../database/entities/schedule.entity';

export interface MigrationResult {
  clients: number;
  media: number;
  alarms: number;
  schedules: number;
}

interface V2Client {
  id: string;
  name: string;
  room: string | null;
  enableSpeakerSelection?: number;
  enableAlarmClock?: number;
  kioskMode?: number;
  enableContentSearch?: number;
  sleepTimer?: number;
  autoplayEnabled?: number;
  repeatEnabled?: number;
}

interface V2MediaItem {
  id: string;
  clientId: string;
  title: string;
  artist: string;
  cover: string | null;
  type: string | null;
  category: string;
  contentType: string | null;
  spotifyUri: string | null;
  spotifyId: string | null;
  artistId: string | null;
  metadata: string | null;
  createdAt?: string;
}

interface V2Alarm {
  id: string;
  clientId: string;
  name: string;
  time: string;
  enabled?: number;
  days: string;
  mediaId: string | null;
  mediaTitle: string | null;
  volume?: number;
  fadeIn?: number;
  fadeDuration?: number;
}

interface V2Schedule {
  id: string;
  clientId: string;
  category: string;
  startTime: string;
  endTime: string;
  days: string;
  enabled?: number;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,
    @InjectRepository(AlarmEntity)
    private readonly alarmRepo: Repository<AlarmEntity>,
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
  ) {}

  async migrate(v2DbPath: string): Promise<MigrationResult> {
    this.logger.log(`Starting migration from v2 database: ${v2DbPath}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (BetterSqlite3 as any).default ?? BetterSqlite3;
    const db = new Ctor(v2DbPath, { readonly: true }) as BetterSqlite3.Database;

    try {
      const clients = await this.migrateClients(db);
      const media = await this.migrateMedia(db);
      const alarms = await this.migrateAlarms(db);
      const schedules = await this.migrateSchedules(db);

      const result: MigrationResult = { clients, media, alarms, schedules };
      this.logger.log(`Migration complete: ${JSON.stringify(result)}`);
      return result;
    } finally {
      db.close();
    }
  }

  private async migrateClients(db: BetterSqlite3.Database): Promise<number> {
    let rows: V2Client[] = [];
    try {
      rows = db.prepare('SELECT * FROM clients').all() as V2Client[];
    } catch {
      this.logger.warn('No clients table found in v2 database');
      return 0;
    }

    let count = 0;
    for (const row of rows) {
      const existing = await this.clientRepo.findOne({ where: { id: row.id } });
      if (existing) continue;

      const entity = this.clientRepo.create({
        id: row.id,
        name: row.name,
        room: row.room ?? null,
        enableSpeakerSelection: row.enableSpeakerSelection === 1,
        enableAlarmClock: row.enableAlarmClock === 1,
        kioskMode: row.kioskMode === 1,
        enableContentSearch: row.enableContentSearch === 1,
        sleepTimer: row.sleepTimer ?? 0,
        autoplayEnabled: row.autoplayEnabled === 1,
        repeatEnabled: row.repeatEnabled === 1,
        isActive: true,
      });

      await this.clientRepo.save(entity);
      count++;
    }

    this.logger.log(`Migrated ${count} clients`);
    return count;
  }

  private async migrateMedia(db: BetterSqlite3.Database): Promise<number> {
    let rows: V2MediaItem[] = [];
    try {
      rows = db.prepare('SELECT * FROM media_items').all() as V2MediaItem[];
    } catch {
      this.logger.warn('No media_items table found in v2 database');
      return 0;
    }

    let count = 0;
    for (const row of rows) {
      const existing = await this.mediaRepo.findOne({ where: { id: row.id, clientId: row.clientId } });
      if (existing) continue;

      let metadata: Record<string, unknown> | null = null;
      if (row.metadata) {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>;
        } catch {
          metadata = null;
        }
      }

      const entity = this.mediaRepo.create({
        id: row.id,
        clientId: row.clientId,
        title: row.title,
        artist: row.artist,
        cover: row.cover ?? null,
        type: row.type ?? null,
        category: row.category,
        contentType: row.contentType ?? null,
        spotifyUri: row.spotifyUri ?? null,
        spotifyId: row.spotifyId ?? null,
        artistId: row.artistId ?? null,
        metadata,
      });

      await this.mediaRepo.save(entity);
      count++;
    }

    this.logger.log(`Migrated ${count} media items`);
    return count;
  }

  private async migrateAlarms(db: BetterSqlite3.Database): Promise<number> {
    let rows: V2Alarm[] = [];
    try {
      rows = db.prepare('SELECT * FROM alarms').all() as V2Alarm[];
    } catch {
      this.logger.warn('No alarms table found in v2 database');
      return 0;
    }

    let count = 0;
    for (const row of rows) {
      const existing = await this.alarmRepo.findOne({ where: { id: row.id } });
      if (existing) continue;

      let days: number[] = [];
      try {
        days = JSON.parse(row.days) as number[];
      } catch {
        days = [];
      }

      const entity = this.alarmRepo.create({
        id: row.id || uuidv4(),
        clientId: row.clientId,
        name: row.name,
        time: row.time,
        enabled: row.enabled !== 0,
        days,
        mediaId: row.mediaId ?? null,
        mediaTitle: row.mediaTitle ?? null,
        volume: row.volume ?? 50,
        fadeIn: row.fadeIn === 1,
        fadeDuration: row.fadeDuration ?? 30,
      });

      await this.alarmRepo.save(entity);
      count++;
    }

    this.logger.log(`Migrated ${count} alarms`);
    return count;
  }

  private async migrateSchedules(db: BetterSqlite3.Database): Promise<number> {
    let rows: V2Schedule[] = [];
    try {
      rows = db.prepare('SELECT * FROM category_schedules').all() as V2Schedule[];
    } catch {
      try {
        rows = db.prepare('SELECT * FROM schedules').all() as V2Schedule[];
      } catch {
        this.logger.warn('No schedules table found in v2 database');
        return 0;
      }
    }

    let count = 0;
    for (const row of rows) {
      const existing = await this.scheduleRepo.findOne({ where: { id: row.id } });
      if (existing) continue;

      let days: number[] = [];
      try {
        days = JSON.parse(row.days) as number[];
      } catch {
        days = [];
      }

      const entity = this.scheduleRepo.create({
        id: row.id || uuidv4(),
        clientId: row.clientId,
        category: row.category,
        startTime: row.startTime,
        endTime: row.endTime,
        days,
        enabled: row.enabled !== 0,
      });

      await this.scheduleRepo.save(entity);
      count++;
    }

    this.logger.log(`Migrated ${count} schedules`);
    return count;
  }
}
