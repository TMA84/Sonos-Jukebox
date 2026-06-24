import { Module } from '@nestjs/common';
import { SonosService } from './sonos.service';
import { SonosController } from './sonos.controller';

@Module({
  providers: [SonosService],
  controllers: [SonosController],
  exports: [SonosService],
})
export class SonosModule {}
