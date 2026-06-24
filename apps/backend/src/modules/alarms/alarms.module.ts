import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmEntity } from '../../database/entities/alarm.entity';
import { ClientEntity } from '../../database/entities/client.entity';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { SonosModule } from '../sonos/sonos.module';

@Module({
  imports: [TypeOrmModule.forFeature([AlarmEntity, ClientEntity]), SonosModule],
  providers: [AlarmsService],
  controllers: [AlarmsController],
  exports: [AlarmsService],
})
export class AlarmsModule {}
