import { Injectable, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of } from 'rxjs';
import { MediaApiService } from '../services/media-api.service';
import { Media } from '../../shared/models/media.model';

interface MediaState {
  items: Media[];
  loading: boolean;
  error: string | null;
  selectedCategory: string;
  searchQuery: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaStore {
  private mediaApi = inject(MediaApiService);

  // State signals
  private state = signal<MediaState>({
    items: [],
    loading: false,
    error: null,
    selectedCategory: 'audiobook',
    searchQuery: '',
  });

  // Selectors
  items = computed(() => this.state().items);
  loading = computed(() => this.state().loading);
  error = computed(() => this.state().error);
  selectedCategory = computed(() => this.state().selectedCategory);
  searchQuery = computed(() => this.state().searchQuery);

  // Filtered items based on category and search
  filteredItems = computed(() => {
    const { items, selectedCategory, searchQuery } = this.state();
    let filtered = items.filter(item => item.category === selectedCategory);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(query) ||
          item.artist?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Group items by artist
  artistGroups = computed(() => {
    const items = this.filteredItems();
    const groups = new Map<string, Media[]>();

    items.forEach(item => {
      const artist = item.artist || 'Unknown Artist';
      if (!groups.has(artist)) {
        groups.set(artist, []);
      }
      groups.get(artist)!.push(item);
    });

    return Array.from(groups.entries()).map(([artist, items]) => ({
      artist,
      items,
      cover: items[0].cover,
    }));
  });

  // Actions
  loadMedia(clientId: string, category?: string) {
    this.state.update(state => ({ ...state, loading: true, error: null }));

    this.mediaApi
      .getMedia(clientId, category)
      .pipe(
        tap(items => {
          this.state.update(state => ({
            ...state,
            items,
            loading: false,
          }));
        }),
        catchError(error => {
          this.state.update(state => ({
            ...state,
            loading: false,
            error: error.message || 'Failed to load media',
          }));
          return of([]);
        })
      )
      .subscribe();
  }

  addMedia(media: Partial<Media>) {
    this.mediaApi
      .createMedia(media)
      .pipe(
        tap(newMedia => {
          this.state.update(state => ({
            ...state,
            items: [...state.items, newMedia],
          }));
        }),
        catchError(error => {
          console.error('Failed to add media:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  deleteMedia(id: string, clientId: string) {
    this.mediaApi
      .deleteMedia(id, clientId)
      .pipe(
        tap(() => {
          this.state.update(state => ({
            ...state,
            items: state.items.filter(item => item.id !== id),
          }));
        }),
        catchError(error => {
          console.error('Failed to delete media:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  setCategory(category: string) {
    this.state.update(state => ({ ...state, selectedCategory: category }));
  }

  setSearchQuery(query: string) {
    this.state.update(state => ({ ...state, searchQuery: query }));
  }

  clearError() {
    this.state.update(state => ({ ...state, error: null }));
  }
}
