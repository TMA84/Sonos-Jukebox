import { Module } from '@nestjs/common';
import { SleepTimerService } from './sleep-timer.service';
import { SleepTimerController } from './sleep-timer.controller';
import { SonosModule } from '../sonos/sonos.module';

@Module({
  imports: [SonosModule],
  providers: [SleepTimerService],
  controllers: [SleepTimerController],
  exports: [SleepTimerService],
})
export class SleepTimerModule {}
