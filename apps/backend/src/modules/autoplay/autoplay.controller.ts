import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { AutoplayService, AutoplaySettings } from './autoplay.service';
import { MediaItemEntity } from '../../database/entities/media-item.entity';

@Controller('api/autoplay')
export class AutoplayController {
  constructor(private readonly autoplayService: AutoplayService) {}

  @Get(':clientId')
  getSettings(@Param('clientId') clientId: string): Promise<AutoplaySettings> {
    return this.autoplayService.getSettings(clientId);
  }

  @Put(':clientId')
  updateSettings(
    @Param('clientId') clientId: string,
    @Body() dto: Partial<AutoplaySettings>,
  ): Promise<AutoplaySettings> {
    return this.autoplayService.updateSettings(clientId, dto);
  }

  @Get(':clientId/queue')
  getQueue(@Param('clientId') clientId: string): Promise<MediaItemEntity[]> {
    return this.autoplayService.getQueue(clientId);
  }

  @Post(':clientId/next')
  playNext(@Param('clientId') clientId: string): Promise<MediaItemEntity | null> {
    return this.autoplayService.playNext(clientId);
  }
}
