import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../../database/entities/client.entity';
import { MediaItemEntity } from '../../database/entities/media-item.entity';
import { AlarmEntity } from '../../database/entities/alarm.entity';
import { ScheduleEntity } from '../../database/entities/schedule.entity';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, MediaItemEntity, AlarmEntity, ScheduleEntity])],
  providers: [MigrationService],
  controllers: [MigrationController],
})
export class MigrationModule {}
