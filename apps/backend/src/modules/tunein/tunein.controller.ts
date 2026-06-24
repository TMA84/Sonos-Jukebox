import { Controller, Get, Param, Query } from '@nestjs/common';
import { TuneInService } from './tunein.service';
import { TuneInStation } from '@sonos-jukebox/shared';

@Controller('api/tunein')
export class TuneInController {
  constructor(private readonly tuneInService: TuneInService) {}

  @Get('search')
  search(@Query('query') query: string): Promise<TuneInStation[]> {
    return this.tuneInService.search(query);
  }

  @Get(':id/stream')
  getStreamUri(@Param('id') id: string): Promise<string | null> {
    return this.tuneInService.getStreamUri(id);
  }
}
