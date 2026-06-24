import { Injectable, Logger } from '@nestjs/common';
import {
  SpotifySearchResult,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyShow,
  SpotifyAudiobook,
  SpotifyEpisode,
  SpotifyChapter,
  PaginatedResult,
  TokenResponse,
} from '@sonos-jukebox/shared';

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface SpotifyApiAlbum {
  id: string;
  name: string;
  uri: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  artists: Array<{ id: string; name: string }>;
}

interface SpotifyApiArtist {
  id: string;
  name: string;
  uri: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  followers?: { total: number };
}

interface SpotifyApiShow {
  id: string;
  name: string;
  publisher: string;
  uri: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
}

interface SpotifyApiAudiobook {
  id: string;
  name: string;
  authors: Array<{ name: string }>;
  uri: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
}

interface SpotifyApiEpisode {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  release_date: string;
}

interface SpotifyApiChapter {
  id: string;
  name: string;
  uri: string;
  chapter_number: number;
  duration_ms: number;
}

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly apiBase = 'https://api.spotify.com/v1';
  private cachedToken: CachedToken | null = null;

  async getAccessToken(): Promise<string | null> {
    const clientId = process.env['SPOTIFY_CLIENT_ID'];
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      this.logger.warn('Spotify credentials not configured');
      return null;
    }

    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.token;
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = (await response.json()) as TokenResponse & { expires_in: number };
      this.cachedToken = {
        token: data.access_token,
        expiresAt: now + 50 * 60 * 1000,
      };
      return this.cachedToken.token;
    } catch (error) {
      this.logger.error(`Failed to get Spotify access token: ${(error as Error).message}`);
      return null;
    }
  }

  private async fetchApi<T>(path: string): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiBase}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} for ${path}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      this.logger.error(`Spotify API request failed: ${(error as Error).message}`);
      return null;
    }
  }

  async search(query: string, types: string): Promise<SpotifySearchResult> {
    const encodedQuery = encodeURIComponent(query);
    const result = await this.fetchApi<{
      albums?: { items: SpotifyApiAlbum[] };
      artists?: { items: SpotifyApiArtist[] };
      shows?: { items: SpotifyApiShow[] };
      audiobooks?: { items: SpotifyApiAudiobook[] };
    }>(`/search?q=${encodedQuery}&type=${types}&limit=20`);

    if (!result) {
      return { albums: [], artists: [], shows: [], audiobooks: [] };
    }

    return {
      albums: (result.albums?.items ?? []).map(
        (a): SpotifyAlbum => ({
          id: a.id,
          name: a.name,
          artist: a.artists[0]?.name ?? '',
          uri: a.uri,
          images: a.images,
        }),
      ),
      artists: (result.artists?.items ?? []).map(
        (a): SpotifyArtist => ({
          id: a.id,
          name: a.name,
          uri: a.uri,
          images: a.images,
          followers: a.followers?.total,
        }),
      ),
      shows: (result.shows?.items ?? []).map(
        (s): SpotifyShow => ({
          id: s.id,
          name: s.name,
          publisher: s.publisher,
          uri: s.uri,
          images: s.images,
        }),
      ),
      audiobooks: (result.audiobooks?.items ?? []).map(
        (b): SpotifyAudiobook => ({
          id: b.id,
          name: b.name,
          authors: b.authors,
          uri: b.uri,
          images: b.images,
        }),
      ),
    };
  }

  async getArtistAlbums(
    artistId: string,
    offset = 0,
    limit = 20,
  ): Promise<PaginatedResult<SpotifyAlbum>> {
    const result = await this.fetchApi<{
      items: SpotifyApiAlbum[];
      total: number;
      offset: number;
      limit: number;
    }>(`/artists/${artistId}/albums?limit=${limit}&offset=${offset}&include_groups=album,single`);

    if (!result) return { items: [], total: 0, offset, limit };

    return {
      items: result.items.map(
        (a): SpotifyAlbum => ({
          id: a.id,
          name: a.name,
          artist: a.artists[0]?.name ?? '',
          uri: a.uri,
          images: a.images,
        }),
      ),
      total: result.total,
      offset: result.offset,
      limit: result.limit,
    };
  }

  async getShowEpisodes(
    showId: string,
    offset = 0,
    limit = 20,
  ): Promise<PaginatedResult<SpotifyEpisode>> {
    const result = await this.fetchApi<{
      items: SpotifyApiEpisode[];
      total: number;
      offset: number;
      limit: number;
    }>(`/shows/${showId}/episodes?limit=${limit}&offset=${offset}`);

    if (!result) return { items: [], total: 0, offset, limit };

    return {
      items: result.items.map(
        (e): SpotifyEpisode => ({
          id: e.id,
          name: e.name,
          uri: e.uri,
          durationMs: e.duration_ms,
          releaseDate: e.release_date,
        }),
      ),
      total: result.total,
      offset: result.offset,
      limit: result.limit,
    };
  }

  async getAudiobookChapters(audiobookId: string): Promise<SpotifyChapter[]> {
    const result = await this.fetchApi<{ items: SpotifyApiChapter[] }>(
      `/audiobooks/${audiobookId}/chapters`,
    );

    if (!result) return [];

    return result.items.map(
      (c): SpotifyChapter => ({
        id: c.id,
        name: c.name,
        uri: c.uri,
        chapterNumber: c.chapter_number,
        durationMs: c.duration_ms,
      }),
    );
  }
}
