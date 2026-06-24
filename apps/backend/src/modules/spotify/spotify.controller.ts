import { Controller, Get, Param, Query } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import {
  SpotifySearchResult,
  SpotifyAlbum,
  SpotifyEpisode,
  SpotifyChapter,
  PaginatedResult,
} from '@sonos-jukebox/shared';

@Controller('api/spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('search')
  search(
    @Query('query') query: string,
    @Query('types') types: string,
  ): Promise<SpotifySearchResult> {
    return this.spotifyService.search(query, types);
  }

  @Get('artists/:id/albums')
  getArtistAlbums(
    @Param('id') id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<SpotifyAlbum>> {
    return this.spotifyService.getArtistAlbums(
      id,
      offset ? parseInt(offset, 10) : 0,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('shows/:id/episodes')
  getShowEpisodes(
    @Param('id') id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<SpotifyEpisode>> {
    return this.spotifyService.getShowEpisodes(
      id,
      offset ? parseInt(offset, 10) : 0,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('audiobooks/:id/chapters')
  getAudiobookChapters(@Param('id') id: string): Promise<SpotifyChapter[]> {
    return this.spotifyService.getAudiobookChapters(id);
  }
}
