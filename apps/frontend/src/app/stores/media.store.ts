import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MediaItem, MediaCategory } from '@sonos-jukebox/shared';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class MediaStore {
  private readonly api = inject(ApiService);

  readonly items = signal<MediaItem[]>([]);
  readonly loading = signal(false);
  readonly selectedCategory = signal<string | null>(null);
  readonly searchQuery = signal('');

  private readonly _debouncedQuery = signal('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filteredItems = computed(() => {
    const category = this.selectedCategory();
    const query = this._debouncedQuery().toLowerCase();

    let result = this.items();
    if (category) {
      result = result.filter((item) => item.category === category);
    }
    if (query) {
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.artist?.toLowerCase().includes(query),
      );
    }
    return result;
  });

  constructor() {
    effect(() => {
      const q = this.searchQuery();
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._debouncedQuery.set(q);
      }, 300);
    });
  }

  async loadItems(clientId: string): Promise<void> {
    this.loading.set(true);
    try {
      const items = await firstValueFrom(this.api.getMedia(clientId));
      this.items.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  async addItem(dto: Partial<MediaItem>): Promise<MediaItem> {
    const created = await firstValueFrom(this.api.createMedia(dto));
    this.items.update((items) => [created, ...items]);
    return created;
  }

  async updateItem(id: string, clientId: string, dto: Partial<MediaItem>): Promise<void> {
    const updated = await firstValueFrom(this.api.updateMedia(id, clientId, dto));
    this.items.update((items) => items.map((item) => (item.id === id ? updated : item)));
  }

  async removeItem(id: string, clientId: string): Promise<void> {
    await firstValueFrom(this.api.deleteMedia(id, clientId));
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}
