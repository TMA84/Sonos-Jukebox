import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerStore } from '../../stores/player.store';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { MediaStore } from '../../stores/media.store';
import { ClientStore } from '../../stores/client.store';
import { MediaItem } from '@sonos-jukebox/shared';

const PAGE_SIZE = 30;

const CATEGORY_TABS: { label: string; value: string | null }[] = [
  { label: 'Alle', value: null },
  { label: 'Hörbuch', value: 'audiobook' },
  { label: 'Musik', value: 'music' },
  { label: 'Playlist', value: 'playlist' },
  { label: 'Radio', value: 'radio' },
  { label: 'Podcast', value: 'podcast' },
  { label: 'Hörspiel', value: 'hoerspiel' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Sonos Jukebox</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Mediathek durchsuchen..."
          [value]="mediaStore.searchQuery()"
          (ionInput)="onSearchInput($event)"
          (ionClear)="onSearchClear()"
        ></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="selectedSegmentValue()" (ionChange)="onCategoryChange($event)">
          @for (tab of categoryTabs; track tab.value) {
            <ion-segment-button [value]="tab.value ?? 'all'">
              <ion-label>{{ tab.label }}</ion-label>
            </ion-segment-button>
          }
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (mediaStore.loading()) {
        <div style="display: flex; justify-content: center; padding: 48px">
          <ion-spinner></ion-spinner>
        </div>
      } @else {
        <ion-grid>
          <ion-row>
            @for (item of visibleItems(); track item.id) {
              <ion-col size="6" size-md="4" size-lg="3">
                <ion-card button (click)="onMediaItemTap(item)">
                  @if (item.cover) {
                    <img [src]="item.cover" [alt]="item.title" style="width:100%;aspect-ratio:1;object-fit:cover" />
                  } @else {
                    <div style="width:100%;aspect-ratio:1;background:#333;display:flex;align-items:center;justify-content:center">
                      <span style="font-size:2rem">&#127925;</span>
                    </div>
                  }
                  <ion-card-header>
                    <ion-card-title style="font-size:0.9rem">{{ item.title }}</ion-card-title>
                    @if (item.artist) {
                      <ion-card-subtitle>{{ item.artist }}</ion-card-subtitle>
                    }
                  </ion-card-header>
                </ion-card>
              </ion-col>
            }
          </ion-row>
        </ion-grid>

        @if (hasMore()) {
          <ion-infinite-scroll (ionInfinite)="onInfiniteScroll($event)">
            <ion-infinite-scroll-content></ion-infinite-scroll-content>
          </ion-infinite-scroll>
        }
      }
    </ion-content>
  `,
})
export class HomePage {
  protected readonly mediaStore = inject(MediaStore);
  private readonly clientStore = inject(ClientStore);
  private readonly playerStore = inject(PlayerStore);
  private readonly router = inject(Router);

  protected readonly categoryTabs = CATEGORY_TABS;
  protected readonly displayedCount = signal(PAGE_SIZE);

  protected readonly selectedSegmentValue = computed(() => {
    const cat = this.mediaStore.selectedCategory();
    return cat ?? 'all';
  });

  protected readonly visibleItems = computed(() =>
    this.mediaStore.filteredItems().slice(0, this.displayedCount()),
  );

  protected readonly hasMore = computed(
    () => this.displayedCount() < this.mediaStore.filteredItems().length,
  );

  constructor() {
    effect(() => {
      const client = this.clientStore.currentClient();
      if (client) {
        this.mediaStore.loadItems(client.id);
        this.displayedCount.set(PAGE_SIZE);
      }
    });
  }

  onSearchInput(event: CustomEvent): void {
    this.mediaStore.searchQuery.set(event.detail.value ?? '');
    this.displayedCount.set(PAGE_SIZE);
  }

  onSearchClear(): void {
    this.mediaStore.searchQuery.set('');
    this.displayedCount.set(PAGE_SIZE);
  }

  onCategoryChange(event: CustomEvent): void {
    const val = event.detail.value;
    this.mediaStore.selectedCategory.set(val === 'all' ? null : val);
    this.displayedCount.set(PAGE_SIZE);
  }

  onMediaItemTap(item: MediaItem): void {
    this.playerStore.currentMediaItem.set(item);
    this.router.navigate(['/player'], {
      queryParams: { mediaId: item.id, clientId: item.clientId },
    });
  }

  onInfiniteScroll(event: CustomEvent): void {
    this.displayedCount.update((c) => c + PAGE_SIZE);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }
}

export default HomePage;
