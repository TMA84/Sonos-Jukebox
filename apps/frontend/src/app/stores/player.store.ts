import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PlaybackState, MediaItem, SonosSpeaker } from '@sonos-jukebox/shared';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly api = inject(ApiService);

  readonly state = signal<PlaybackState | null>(null);
  readonly currentMediaItem = signal<MediaItem | null>(null);
  readonly speakers = signal<SonosSpeaker[]>([]);
  readonly pollingActive = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private suppressPollingUntil = 0;

  async loadSpeakers(): Promise<void> {
    const speakers = await firstValueFrom(this.api.getSpeakers());
    this.speakers.set(speakers);
  }

  startPolling(room: string): void {
    this.stopPolling();
    this.pollingActive.set(true);
    this.intervalId = setInterval(async () => {
      if (Date.now() < this.suppressPollingUntil) return;
      try {
        const s = await firstValueFrom(this.api.getSonosState(room));
        this.state.set(s);
      } catch {
        /* ignore polling errors */
      }
    }, 3_000);
  }

  stopPolling(): void {
    this.pollingActive.set(false);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private suppressPolling(): void {
    this.suppressPollingUntil = Date.now() + 1_500;
  }

  async play(dto: { room: string; uri?: string; metadata?: string }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.play(dto));
  }

  async pause(dto: { room: string }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.pause(dto));
  }

  async stop(dto: { room: string }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.stop(dto));
  }

  async next(dto: { room: string }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.next(dto));
  }

  async previous(dto: { room: string }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.previous(dto));
  }

  async setVolume(dto: { room: string; volume: number }): Promise<void> {
    await firstValueFrom(this.api.setVolume(dto));
  }

  async seek(dto: { room: string; seconds: number }): Promise<void> {
    this.suppressPolling();
    await firstValueFrom(this.api.seek(dto));
  }
}
