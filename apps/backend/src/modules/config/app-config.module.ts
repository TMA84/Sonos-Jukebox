import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';

@Module({
  providers: [AppConfigService],
  controllers: [AppConfigController],
  exports: [AppConfigService],
})
export class AppConfigModule {}
