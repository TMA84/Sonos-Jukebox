import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientEntity } from './entities/client.entity';
import { MediaItemEntity } from './entities/media-item.entity';
import { AlarmEntity } from './entities/alarm.entity';
import { ScheduleEntity } from './entities/schedule.entity';
import { UserEntity } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('database.path', './data/sonos-jukebox.db'),
        entities: [ClientEntity, MediaItemEntity, AlarmEntity, ScheduleEntity, UserEntity],
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
