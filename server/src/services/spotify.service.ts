import SpotifyWebApi from 'spotify-web-api-node';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private tokenExpirationTime: number = 0;

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
  }

  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    if (now < this.tokenExpirationTime) {
      return; // Token still valid
    }

    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body.access_token);
      this.tokenExpirationTime = now + (data.body.expires_in - 60) * 1000; // Refresh 1 min early
      logger.info('Spotify access token refreshed');
    } catch (error: any) {
      logger.error('Failed to get Spotify access token:', error);
      throw new AppError(500, 'Failed to authenticate with Spotify');
    }
  }

  async searchAlbums(query: string, limit = 20, offset = 0) {
    await this.ensureValidToken();

    try {
      const result = await this.spotifyApi.searchAlbums(query, {
        limit,
        offset,
        market: 'DE',
      });
      return result.body.albums;
    } catch (error: any) {
      logger.error('Spotify search error:', error);
      throw new AppError(500, 'Failed to search albums on Spotify');
    }
  }

  async searchArtists(query: string, limit = 20, offset = 0) {
    await this.ensureValidToken();

    try {
      const result = await this.spotifyApi.searchArtists(query, {
        limit,
        offset,
        market: 'DE',
      });
      return result.body.artists;
    } catch (error: any) {
      logger.error('Spotify search error:', error);
      throw new AppError(500, 'Failed to search artists on Spotify');
    }
  }

  async getArtistAlbums(artistId: string, limit = 20, offset = 0) {
    await this.ensureValidToken();

    try {
      const result = await this.spotifyApi.getArtistAlbums(artistId, {
        include_groups: 'album,single',
        market: 'DE',
        limit,
        offset,
      });
      return result.body;
    } catch (error: any) {
      logger.error('Spotify artist albums error:', error);
      throw new AppError(500, 'Failed to get artist albums from Spotify');
    }
  }

  async getAlbum(albumId: string) {
    await this.ensureValidToken();

    try {
      const result = await this.spotifyApi.getAlbum(albumId, { market: 'DE' });
      return result.body;
    } catch (error: any) {
      logger.error('Spotify get album error:', error);
      throw new AppError(500, 'Failed to get album from Spotify');
    }
  }

  isConfigured(): boolean {
    return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
  }
}
