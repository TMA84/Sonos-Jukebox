import { Component, Input, signal, computed, inject, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  searchOutline,
  addOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { ApiService } from '../../services/api.service';
import {
  MediaItem,
  MediaCategory,
  MediaSourceType,
  ContentType,
  SpotifySearchResult,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyShow,
  SpotifyAudiobook,
  TuneInStation,
} from '@sonos-jukebox/shared';

type SearchType = 'album' | 'artist' | 'show' | 'audiobook' | 'radio';
type SearchResultItem = SpotifyAlbum | SpotifyArtist | SpotifyShow | SpotifyAudiobook | TuneInStation;

@Component({
  selector: 'app-add-media-modal',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonIcon,
    IonSearchbar,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Inhalte hinzufügen</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        @for (type of searchTypes; track type.value) {
          <ion-button
            size="small"
            [fill]="searchType() === type.value ? 'solid' : 'outline'"
            (click)="searchType.set(type.value); searchResults.set([])"
          >{{ type.label }}</ion-button>
        }
      </div>

      <ion-searchbar
        [value]="searchQuery()"
        (ionInput)="searchQuery.set($event.detail.value ?? '')"
        (ionClear)="searchQuery.set(''); searchResults.set([])"
        placeholder="Suchen..."
        (keyup.enter)="onSearch()"
      ></ion-searchbar>

      <ion-button expand="block" (click)="onSearch()" [disabled]="searchLoading()">
        @if (searchLoading()) {
          <ion-spinner slot="start" name="crescent"></ion-spinner>
        } @else {
          <ion-icon name="search-outline" slot="start"></ion-icon>
        }
        Suchen
      </ion-button>

      <ion-list>
        @for (result of searchResults(); track getResultId(result)) {
          <ion-item>
            @if (getResultCover(result)) {
              <ion-thumbnail slot="start">
                <img [src]="getResultCover(result)" [alt]="getResultTitle(result)" />
              </ion-thumbnail>
            }
            <ion-label>
              <h2>{{ getResultTitle(result) }}</h2>
              <p>{{ getResultSubtitle(result) }}</p>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              [color]="isInLibrary(getResultId(result)) ? 'success' : 'primary'"
              (click)="addResult(result)"
              [disabled]="isInLibrary(getResultId(result))"
            >
              <ion-icon
                [name]="isInLibrary(getResultId(result)) ? 'checkmark-circle-outline' : 'add-outline'"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class AddMediaModalComponent implements OnInit {
  @Input() clientId!: string;
  @Input() existingIds: string[] = [];

  private readonly api = inject(ApiService);
  private readonly modalCtrl = inject(ModalController);

  readonly searchQuery = signal('');
  readonly searchType = signal<SearchType>('album');
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly searchLoading = signal(false);

  private readonly addedIds = signal<string[]>([]);

  readonly searchTypes: { label: string; value: SearchType }[] = [
    { label: 'Album', value: 'album' },
    { label: 'Künstler', value: 'artist' },
    { label: 'Podcast', value: 'show' },
    { label: 'Hörbuch', value: 'audiobook' },
    { label: 'Radio', value: 'radio' },
  ];

  private readonly allAddedOrExistingIds = computed(() => [
    ...this.existingIds,
    ...this.addedIds(),
  ]);

  constructor() {
    addIcons({ closeOutline, searchOutline, addOutline, checkmarkCircleOutline });
  }

  ngOnInit(): void {}

  isInLibrary(id: string): boolean {
    return this.allAddedOrExistingIds().includes(id);
  }

  async onSearch(): Promise<void> {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.searchLoading.set(true);
    try {
      if (this.searchType() === 'radio') {
        const results = await firstValueFrom(this.api.tuneInSearch(q));
        this.searchResults.set(results);
      } else {
        const typeMap: Record<SearchType, string> = {
          album: 'album', artist: 'artist', show: 'show', audiobook: 'audiobook', radio: 'station',
        };
        const result = await firstValueFrom(
          this.api.spotifySearch(q, [typeMap[this.searchType()]]),
        );
        this.searchResults.set(this.extractSpotifyResults(result));
      }
    } finally {
      this.searchLoading.set(false);
    }
  }

  async addResult(result: SearchResultItem): Promise<void> {
    const dto = this.buildMediaDto(result);
    await firstValueFrom(this.api.createMedia(dto));
    this.addedIds.update((ids) => [...ids, this.getResultId(result)]);
  }

  close(): void {
    void this.modalCtrl.dismiss({ addedCount: this.addedIds().length });
  }

  getResultId(result: SearchResultItem): string {
    return (result as { id: string }).id ?? '';
  }

  getResultTitle(result: SearchResultItem): string {
    if (this.searchType() === 'radio') return (result as TuneInStation).name ?? '';
    return (result as SpotifyAlbum).name ?? '';
  }

  getResultSubtitle(result: SearchResultItem): string {
    if (this.searchType() === 'radio') {
      const s = result as TuneInStation;
      return [s.genre, s.bitrate ? `${s.bitrate} kbps` : ''].filter(Boolean).join(' · ');
    }
    if (this.searchType() === 'album') return (result as SpotifyAlbum).artist ?? '';
    if (this.searchType() === 'artist') return 'Künstler';
    if (this.searchType() === 'show') return (result as SpotifyShow).publisher ?? '';
    if (this.searchType() === 'audiobook') {
      const ab = result as SpotifyAudiobook;
      return ab.authors?.map((a) => a.name).join(', ') ?? '';
    }
    return '';
  }

  getResultCover(result: SearchResultItem): string | null {
    if (this.searchType() === 'radio') return (result as TuneInStation).imageUrl ?? null;
    const item = result as SpotifyAlbum;
    return item.images?.[0]?.url ?? null;
  }

  private extractSpotifyResults(result: SpotifySearchResult): SearchResultItem[] {
    switch (this.searchType()) {
      case 'album': return result.albums ?? [];
      case 'artist': return result.artists ?? [];
      case 'show': return result.shows ?? [];
      case 'audiobook': return result.audiobooks ?? [];
      default: return [];
    }
  }

  private buildMediaDto(result: SearchResultItem): Partial<MediaItem> {
    const type = this.searchType();
    if (type === 'radio') {
      const s = result as TuneInStation;
      return {
        id: s.id, clientId: this.clientId,
        title: s.name, artist: s.genre ?? '',
        cover: s.imageUrl ?? null,
        type: MediaSourceType.TuneIn, category: MediaCategory.Radio,
        contentType: null, spotifyUri: null, spotifyId: null,
        metadata: { streamUri: s.streamUri, bitrate: s.bitrate },
      };
    }
    const categoryMap: Record<SearchType, MediaCategory> = {
      album: MediaCategory.Music, artist: MediaCategory.Music,
      show: MediaCategory.Podcast, audiobook: MediaCategory.Audiobook, radio: MediaCategory.Radio,
    };
    if (type === 'album') {
      const a = result as SpotifyAlbum;
      return { id: a.id, clientId: this.clientId, title: a.name, artist: a.artist, cover: a.images?.[0]?.url ?? null, type: MediaSourceType.Spotify, category: categoryMap.album, contentType: ContentType.Album, spotifyUri: a.uri, spotifyId: a.id };
    }
    if (type === 'artist') {
      const a = result as SpotifyArtist;
      return { id: a.id, clientId: this.clientId, title: a.name, artist: a.name, cover: a.images?.[0]?.url ?? null, type: MediaSourceType.Spotify, category: categoryMap.artist, contentType: ContentType.Artist, spotifyUri: a.uri, spotifyId: a.id, artistId: a.id };
    }
    if (type === 'show') {
      const s = result as SpotifyShow;
      return { id: s.id, clientId: this.clientId, title: s.name, artist: s.publisher, cover: s.images?.[0]?.url ?? null, type: MediaSourceType.Spotify, category: categoryMap.show, contentType: ContentType.Show, spotifyUri: s.uri, spotifyId: s.id };
    }
    const ab = result as SpotifyAudiobook;
    return { id: ab.id, clientId: this.clientId, title: ab.name, artist: ab.authors?.map((a) => a.name).join(', ') ?? '', cover: ab.images?.[0]?.url ?? null, type: MediaSourceType.Spotify, category: categoryMap.audiobook, contentType: ContentType.Audiobook, spotifyUri: ab.uri, spotifyId: ab.id };
  }
}

export default AddMediaModalComponent;
