import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonRange,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  playOutline,
  pauseOutline,
  stopOutline,
  playSkipForwardOutline,
  playSkipBackOutline,
  volumeMediumOutline,
} from 'ionicons/icons';
import { PlayerStore } from '../../stores/player.store';
import { ClientStore } from '../../stores/client.store';
import { ApiService } from '../../services/api.service';
import { MediaItem } from '@sonos-jukebox/shared';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonRange,
    IonButtons,
    IonBackButton,
    IonSpinner,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ mediaItem()?.title ?? 'Player' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <ion-spinner></ion-spinner>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0">
          @if (mediaItem()?.cover) {
            <img
              [src]="mediaItem()!.cover!"
              [alt]="mediaItem()!.title"
              style="width:min(280px,100%);aspect-ratio:1;object-fit:cover;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3)"
            />
          } @else {
            <div style="width:min(280px,100%);aspect-ratio:1;background:#1e1e1e;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:4rem">&#127925;</span>
            </div>
          }

          <div style="text-align:center;max-width:320px">
            <div style="font-size:1.2rem;font-weight:600;margin-bottom:4px">
              {{ currentTrack()?.title ?? mediaItem()?.title ?? '—' }}
            </div>
            <div style="font-size:0.9rem;color:var(--ion-color-medium)">
              {{ currentTrack()?.artist ?? mediaItem()?.artist ?? '' }}
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px">
            <button
              style="background:none;border:none;cursor:pointer;padding:8px;color:var(--ion-color-primary)"
              (click)="onPrevious()"
            >
              <ion-icon name="play-skip-back-outline" style="font-size:2rem"></ion-icon>
            </button>
            <button
              style="background:var(--ion-color-primary);border:none;cursor:pointer;padding:16px;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center"
              (click)="isPlaying() ? onPause() : onPlay()"
            >
              <ion-icon
                [name]="isPlaying() ? 'pause-outline' : 'play-outline'"
                style="font-size:2rem"
              ></ion-icon>
            </button>
            <button
              style="background:none;border:none;cursor:pointer;padding:8px;color:var(--ion-color-primary)"
              (click)="onNext()"
            >
              <ion-icon name="play-skip-forward-outline" style="font-size:2rem"></ion-icon>
            </button>
          </div>

          <div style="width:100%;max-width:320px;display:flex;align-items:center;gap:8px">
            <ion-icon name="volume-medium-outline"></ion-icon>
            <ion-range
              style="flex:1"
              [value]="volume()"
              min="0"
              max="100"
              (ionChange)="onVolumeChange($event)"
            ></ion-range>
            <span style="min-width:36px;text-align:right">{{ volume() }}</span>
          </div>

          @if (showSpeakerSelection()) {
            <div style="width:100%;max-width:320px">
              <ion-select
                [value]="currentRoom()"
                (ionChange)="onSpeakerChange($event)"
                label="Lautsprecher"
                labelPlacement="floating"
              >
                @for (speaker of playerStore.speakers(); track speaker.uuid) {
                  <ion-select-option [value]="speaker.roomName">
                    {{ speaker.roomName }}
                  </ion-select-option>
                }
              </ion-select>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
})
export class PlayerPage implements OnInit, OnDestroy {
  protected readonly playerStore = inject(PlayerStore);
  private readonly clientStore = inject(ClientStore);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly mediaItem = signal<MediaItem | null>(null);
  protected readonly volume = signal(50);
  protected readonly currentRoom = signal<string>('');

  private volumeDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly currentTrack = computed(() => {
    const s = this.playerStore.state();
    if (!s) return null;
    return (s as { currentTrack?: { title?: string; artist?: string } }).currentTrack ?? null;
  });

  protected readonly isPlaying = computed(() => {
    const s = this.playerStore.state();
    if (!s) return false;
    return (s as { playbackState?: string }).playbackState === 'PLAYING';
  });

  protected readonly showSpeakerSelection = computed(
    () => this.clientStore.settings()?.enableSpeakerSelection ?? false,
  );

  constructor() {
    addIcons({
      playOutline,
      pauseOutline,
      stopOutline,
      playSkipForwardOutline,
      playSkipBackOutline,
      volumeMediumOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const params = await firstValueFrom(this.route.queryParams);
      const mediaId = params['mediaId'];
      const clientId = params['clientId'];

      const settings = this.clientStore.settings();
      const room = settings?.room ?? '';
      this.currentRoom.set(room);

      if (mediaId && clientId) {
        // Use already-loaded item from store; fall back to fetching only on direct URL access
        let found = this.playerStore.currentMediaItem();
        if (!found || found.id !== mediaId) {
          const items = await firstValueFrom(this.api.getMedia(clientId));
          found = items.find((i) => i.id === mediaId) ?? null;
          this.playerStore.currentMediaItem.set(found);
        }
        this.mediaItem.set(found);

        if (found && room) {
          this.playerStore.startPolling(room);
          const uri = found.spotifyUri ?? this.buildTuneInUri(found);
          // Fire speakers load and play in parallel — they don't depend on each other
          await Promise.all([
            this.playerStore.loadSpeakers(),
            uri ? this.playerStore.play({ room, uri }) : Promise.resolve(),
          ]);
        }
      } else if (room) {
        await this.playerStore.loadSpeakers();
        this.playerStore.startPolling(room);
      }

      const currentVol = (
        this.playerStore.state() as { volume?: number } | null
      )?.volume ?? 50;
      this.volume.set(currentVol);
    } finally {
      this.loading.set(false);
    }
  }

  private buildTuneInUri(item: MediaItem): string | undefined {
    const meta = item.metadata as { streamUri?: string } | null;
    if (meta?.streamUri) return meta.streamUri;
    if (item.id && item.type === 'tunein') return `tunein:station:${item.id}`;
    return undefined;
  }

  ngOnDestroy(): void {
    this.playerStore.stopPolling();
  }

  async onPlay(): Promise<void> {
    const room = this.currentRoom();
    const item = this.mediaItem();
    const uri = item ? (item.spotifyUri ?? this.buildTuneInUri(item)) : undefined;
    await this.playerStore.play({ room, uri });
  }

  async onPause(): Promise<void> {
    await this.playerStore.pause({ room: this.currentRoom() });
  }

  async onStop(): Promise<void> {
    await this.playerStore.stop({ room: this.currentRoom() });
  }

  async onNext(): Promise<void> {
    await this.playerStore.next({ room: this.currentRoom() });
  }

  async onPrevious(): Promise<void> {
    await this.playerStore.previous({ room: this.currentRoom() });
  }

  onVolumeChange(event: CustomEvent): void {
    const vol = event.detail.value as number;
    this.volume.set(vol);
    if (this.volumeDebounce !== null) clearTimeout(this.volumeDebounce);
    this.volumeDebounce = setTimeout(() => {
      this.playerStore.setVolume({ room: this.currentRoom(), volume: vol });
    }, 300);
  }

  onSpeakerChange(event: CustomEvent): void {
    const room = event.detail.value as string;
    this.currentRoom.set(room);
    this.playerStore.stopPolling();
    this.playerStore.startPolling(room);
  }
}

export default PlayerPage;
