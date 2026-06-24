import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SonosService } from './sonos.service';
import { PlaybackState, SonosSpeaker } from '@sonos-jukebox/shared';

@Controller('api/sonos')
export class SonosController {
  constructor(private readonly sonosService: SonosService) {}

  @Get('speakers')
  getSpeakers(): Promise<SonosSpeaker[]> {
    return this.sonosService.getSpeakers();
  }

  @Get('state')
  getState(@Query('room') room: string): Promise<PlaybackState | null> {
    return this.sonosService.getState(room);
  }

  @Post('play')
  async play(@Body() body: { room: string; uri?: string; metadata?: string }): Promise<void> {
    return this.sonosService.play(body.room, body.uri, body.metadata);
  }

  @Post('pause')
  async pause(@Body() body: { room: string }): Promise<void> {
    return this.sonosService.pause(body.room);
  }

  @Post('stop')
  async stop(@Body() body: { room: string }): Promise<void> {
    return this.sonosService.stop(body.room);
  }

  @Post('next')
  async next(@Body() body: { room: string }): Promise<void> {
    return this.sonosService.next(body.room);
  }

  @Post('previous')
  async previous(@Body() body: { room: string }): Promise<void> {
    return this.sonosService.previous(body.room);
  }

  @Post('volume')
  async setVolume(@Body() body: { room: string; volume: number }): Promise<void> {
    return this.sonosService.setVolume(body.room, body.volume);
  }

  @Post('seek')
  async seek(@Body() body: { room: string; position: number }): Promise<void> {
    return this.sonosService.seek(body.room, body.position);
  }
}
