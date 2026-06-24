import { Injectable } from '@nestjs/common';

export interface AppConfig {
  spotifyClientId: string | null;
  spotifyClientSecret: string | null;
}

export interface AppConfigStatus {
  spotifyClientId: boolean;
  spotifyClientSecret: boolean;
}

@Injectable()
export class AppConfigService {
  getConfig(): AppConfig {
    return {
      spotifyClientId: process.env['SPOTIFY_CLIENT_ID'] ?? null,
      spotifyClientSecret: process.env['SPOTIFY_CLIENT_SECRET'] ?? null,
    };
  }

  getStatus(): AppConfigStatus {
    return {
      spotifyClientId: !!process.env['SPOTIFY_CLIENT_ID'],
      spotifyClientSecret: !!process.env['SPOTIFY_CLIENT_SECRET'],
    };
  }
}
