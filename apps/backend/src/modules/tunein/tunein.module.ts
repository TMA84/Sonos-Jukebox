import { Module } from '@nestjs/common';
import { TuneInService } from './tunein.service';
import { TuneInController } from './tunein.controller';

@Module({
  providers: [TuneInService],
  controllers: [TuneInController],
  exports: [TuneInService],
})
export class TuneInModule {}
