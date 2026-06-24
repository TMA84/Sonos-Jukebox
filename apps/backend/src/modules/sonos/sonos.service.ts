import { Injectable, Logger } from '@nestjs/common';
import { PlaybackState, SonosSpeaker } from '@sonos-jukebox/shared';

interface ZoneState {
  coordinator: {
    uuid: string;
    roomName: string;
    state: {
      currentTrack: {
        title: string;
        artist: string;
        album: string;
        absoluteAlbumArtUri: string;
        uri: string;
      };
      playbackState: string;
      volume: number;
      mute: boolean;
      trackPosition: string;
      duration: string;
    };
  };
  members: Array<{ uuid: string; roomName: string }>;
}

@Injectable()
export class SonosService {
  private readonly logger = new Logger(SonosService.name);
  private readonly host: string;
  private readonly port: number;

  constructor() {
    this.host = process.env['SONOS_HOST'] ?? 'localhost';
    this.port = parseInt(process.env['SONOS_PORT'] ?? '5005', 10);
  }

  private get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sonos API error: ${response.status} ${response.statusText} for ${url}`);
    }
    return response.json() as Promise<T>;
  }

  private parseTrackPosition(position: string): number {
    if (!position) return 0;
    const parts = position.split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    }
    return 0;
  }

  async getSpeakers(): Promise<SonosSpeaker[]> {
    try {
      const zones = await this.fetchJson<ZoneState[]>(`${this.baseUrl}/zones`);
      return zones.map((zone) => ({
        uuid: zone.coordinator.uuid,
        name: zone.coordinator.roomName,
        roomName: zone.coordinator.roomName,
      }));
    } catch (error) {
      this.logger.warn(`Failed to get speakers: ${(error as Error).message}`);
      return [];
    }
  }

  async getState(room: string): Promise<PlaybackState | null> {
    try {
      const state = await this.fetchJson<ZoneState['coordinator']['state']>(
        `${this.baseUrl}/${encodeURIComponent(room)}/state`,
      );
      const playbackState = (['PLAYING', 'PAUSED_PLAYBACK', 'STOPPED', 'TRANSITIONING'].includes(state.playbackState)
        ? state.playbackState === 'PAUSED_PLAYBACK'
          ? 'PAUSED'
          : state.playbackState
        : 'STOPPED') as PlaybackState['playbackState'];

      return {
        currentTrack: state.currentTrack
          ? {
              title: state.currentTrack.title,
              artist: state.currentTrack.artist,
              album: state.currentTrack.album,
              albumArtUri: state.currentTrack.absoluteAlbumArtUri,
              uri: state.currentTrack.uri,
            }
          : null,
        playbackState,
        volume: state.volume,
        mute: state.mute,
        trackPosition: this.parseTrackPosition(state.trackPosition),
        trackDuration: this.parseTrackPosition(state.duration),
      };
    } catch (error) {
      this.logger.warn(`Failed to get state for room "${room}": ${(error as Error).message}`);
      return null;
    }
  }

  async play(room: string, uri?: string, metadata?: string): Promise<void> {
    try {
      const encodedRoom = encodeURIComponent(room);
      if (!uri) {
        await fetch(`${this.baseUrl}/${encodedRoom}/play`);
        return;
      }

      if (uri.startsWith('tunein:')) {
        const id = uri.replace('tunein:', '');
        await fetch(`${this.baseUrl}/${encodedRoom}/tunein/play?id=${encodeURIComponent(id)}`);
        return;
      }

      if (
        uri.startsWith('spotify:album:') ||
        uri.startsWith('spotify:artist:') ||
        uri.startsWith('spotify:show:') ||
        uri.startsWith('spotify:audiobook:')
      ) {
        const body: Record<string, string> = { uri };
        if (metadata) body['metadata'] = metadata;
        await fetch(`${this.baseUrl}/${encodedRoom}/spotify/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return;
      }

      await fetch(`${this.baseUrl}/${encodedRoom}/${encodeURIComponent(uri)}/play`);
    } catch (error) {
      this.logger.error(`Failed to play in room "${room}": ${(error as Error).message}`);
    }
  }

  async pause(room: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/pause`);
    } catch (error) {
      this.logger.error(`Failed to pause room "${room}": ${(error as Error).message}`);
    }
  }

  async stop(room: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/stop`);
    } catch (error) {
      this.logger.error(`Failed to stop room "${room}": ${(error as Error).message}`);
    }
  }

  async next(room: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/next`);
    } catch (error) {
      this.logger.error(`Failed to skip to next in room "${room}": ${(error as Error).message}`);
    }
  }

  async previous(room: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/previous`);
    } catch (error) {
      this.logger.error(`Failed to go to previous in room "${room}": ${(error as Error).message}`);
    }
  }

  async setVolume(room: string, volume: number): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/volume/${volume}`);
    } catch (error) {
      this.logger.error(`Failed to set volume in room "${room}": ${(error as Error).message}`);
    }
  }

  async seek(room: string, positionSeconds: number): Promise<void> {
    try {
      const hours = Math.floor(positionSeconds / 3600);
      const minutes = Math.floor((positionSeconds % 3600) / 60);
      const seconds = Math.floor(positionSeconds % 60);
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      await fetch(`${this.baseUrl}/${encodeURIComponent(room)}/seek/${formatted}`);
    } catch (error) {
      this.logger.error(`Failed to seek in room "${room}": ${(error as Error).message}`);
    }
  }
}
