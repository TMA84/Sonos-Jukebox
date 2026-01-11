import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Media } from './media';
import { ClientService } from './client.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AutoplayService {
  private autoplayEnabled = new BehaviorSubject<boolean>(false); // Default OFF
  private currentArtistQueue: Media[] = [];
  private currentIndex = 0;
  private currentArtist: string = '';
  private currentCategory: string = '';

  constructor(private http: HttpClient, private clientService: ClientService) {
    // Load autoplay preference from localStorage for this client
    const clientId = this.clientService.getClientId();
    const saved = localStorage.getItem(`autoplayEnabled_${clientId}`);
    if (saved !== null) {
      this.autoplayEnabled.next(saved === 'true');
    }
  }

  isEnabled(): Observable<boolean> {
    return this.autoplayEnabled.asObservable();
  }

  toggleAutoplay(): void {
    const clientId = this.clientService.getClientId();
    const newValue = !this.autoplayEnabled.value;
    this.autoplayEnabled.next(newValue);
    localStorage.setItem(`autoplayEnabled_${clientId}`, String(newValue));
  }

  setEnabled(enabled: boolean): void {
    const clientId = this.clientService.getClientId();
    this.autoplayEnabled.next(enabled);
    localStorage.setItem(`autoplayEnabled_${clientId}`, String(enabled));
  }

  async buildQueue(currentMedia: Media): Promise<void> {
    if (!currentMedia || !currentMedia.artist) {
      console.warn('Cannot build queue: invalid media', currentMedia);
      return;
    }

    console.log(
      'Building autoplay queue for:',
      currentMedia.title,
      'Artist:',
      currentMedia.artist,
      'Type:',
      currentMedia.contentType,
      'ID:',
      currentMedia.id
    );

    // Reset if artist changed OR if queue is empty
    if (
      this.currentArtist !== currentMedia.artist ||
      this.currentCategory !== currentMedia.category ||
      this.currentArtistQueue.length === 0
    ) {
      console.log('Artist or category changed (or queue empty), fetching new content...');

      // Disable autoplay when manually selecting new media
      this.setEnabled(false);
      console.log('Autoplay disabled for new media selection');

      this.currentArtist = currentMedia.artist;
      this.currentCategory = currentMedia.category || 'audiobook';
      this.currentIndex = 0;
      this.currentArtistQueue = [];

      await this.fetchArtistContent(currentMedia);
      console.log('Queue built with', this.currentArtistQueue.length, 'items');
    } else {
      console.log(
        'Same artist, reusing existing queue with',
        this.currentArtistQueue.length,
        'items'
      );
    }

    // Find current item in queue
    const currentIdx = this.currentArtistQueue.findIndex(
      m =>
        m.id === currentMedia.id ||
        (m.title === currentMedia.title && m.artist === currentMedia.artist)
    );

    if (currentIdx >= 0) {
      this.currentIndex = currentIdx;
      console.log('Found current item at index:', currentIdx, 'of', this.currentArtistQueue.length);
    } else {
      console.log(
        'Current item not found in queue, starting from beginning. Looking for:',
        currentMedia.id,
        currentMedia.title
      );
      console.log(
        'Queue items:',
        this.currentArtistQueue.map(m => ({ id: m.id, title: m.title }))
      );
    }
  }

  private async fetchArtistContent(media: Media): Promise<void> {
    try {
      // First get raw data to find artist ID
      const url = environment.production ? '../api/data' : 'http://localhost:8200/api/data';
      const clientId = this.clientService.getClientId();
      console.log('Fetching artist content with clientId:', clientId);

      const rawData = await this.http
        .get<Media[]>(url, {
          params: { clientId },
        })
        .toPromise();

      console.log('Looking for artist:', media.artist, 'in category:', this.currentCategory);
      console.log('Raw data items:', rawData.length);
      console.log('All artists in raw data:', [...new Set(rawData.map(item => item.artist))]);
      console.log('All categories in raw data:', [
        ...new Set(rawData.map(item => item.category || 'audiobook')),
      ]);
      console.log(
        'Items matching artist name:',
        rawData.filter(item => item.artist === media.artist).length
      );
      console.log(
        'Items matching category:',
        rawData.filter(item => (item.category || 'audiobook') === this.currentCategory).length
      );

      const artistEntry = rawData.find(
        item =>
          item.artist === media.artist && (item.category || 'audiobook') === this.currentCategory
      );

      if (!artistEntry) {
        console.warn('Artist not found in library, trying to use media artistid or search Spotify');

        // Try to use the artistid from the current media if available
        if ((media as any).artistid) {
          console.log('Using artistid from current media:', (media as any).artistid);
          await this.fetchArtistAlbums((media as any).artistid, media.artist);
          return;
        }

        // If no artistid, we can't build a queue
        console.warn('No artistid available, cannot build autoplay queue');
        return;
      }

      // Handle different content types
      if (artistEntry.contentType === 'show' && artistEntry.id) {
        // Fetch all episodes for podcast/show
        await this.fetchShowEpisodes(artistEntry.id, media.artist);
      } else if (artistEntry.contentType === 'audiobook' && artistEntry.id) {
        // For audiobooks, add the audiobook itself
        this.currentArtistQueue = [
          {
            id: artistEntry.id,
            title: artistEntry.title,
            artist: artistEntry.artist,
            cover: artistEntry.cover,
            category: artistEntry.category,
            type: artistEntry.type,
            contentType: 'audiobook',
          },
        ];
      } else if (artistEntry.artistid) {
        // Fetch all albums for music artist
        await this.fetchArtistAlbums(artistEntry.artistid, media.artist);
      }
    } catch (error) {
      console.error('Failed to fetch artist content:', error);
    }
  }

  private async fetchArtistAlbums(artistId: string, artistName: string): Promise<void> {
    try {
      const albums: Media[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      // Fetch all albums (paginated)
      while (hasMore) {
        const searchUrl = environment.production
          ? `../api/spotify/artists/${artistId}/albums`
          : `http://localhost:8200/api/spotify/artists/${artistId}/albums`;

        const response: any = await this.http
          .get(`${searchUrl}?offset=${offset}&limit=${limit}`)
          .toPromise();

        if (response && response.items && response.items.length > 0) {
          const newAlbums = response.items.map(album => ({
            artist: artistName,
            title: album.name,
            type: 'spotify',
            category: this.currentCategory,
            cover: album.images && album.images[0] ? album.images[0].url : '',
            id: album.id,
            contentType: 'album',
          }));

          albums.push(...newAlbums);
          hasMore = response.next !== null;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      this.currentArtistQueue = albums;
      console.log(`Built queue with ${albums.length} albums for ${artistName}`);
    } catch (error) {
      console.error('Failed to fetch artist albums:', error);
    }
  }

  private async fetchShowEpisodes(showId: string, artistName: string): Promise<void> {
    try {
      const episodes: Media[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      // Fetch all episodes (paginated)
      while (hasMore) {
        const searchUrl = environment.production
          ? `../api/spotify/shows/${showId}/episodes`
          : `http://localhost:8200/api/spotify/shows/${showId}/episodes`;

        const response: any = await this.http
          .get(`${searchUrl}?offset=${offset}&limit=${limit}`)
          .toPromise();

        if (response && response.items && response.items.length > 0) {
          const newEpisodes = response.items.map(episode => ({
            artist: artistName,
            title: episode.name,
            type: 'spotify',
            category: this.currentCategory,
            cover: episode.images && episode.images[0] ? episode.images[0].url : '',
            id: episode.id,
            contentType: 'episode',
          }));

          episodes.push(...newEpisodes);
          hasMore = response.next !== null;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      this.currentArtistQueue = episodes;
      console.log(`Built queue with ${episodes.length} episodes for ${artistName}`);
    } catch (error) {
      console.error('Failed to fetch show episodes:', error);
    }
  }

  getNextMedia(): Media | null {
    if (!this.autoplayEnabled.value || this.currentArtistQueue.length === 0) {
      return null;
    }

    // Move to next item
    this.currentIndex++;

    if (this.currentIndex >= this.currentArtistQueue.length) {
      console.log('Reached end of artist queue');
      return null;
    }

    return this.currentArtistQueue[this.currentIndex];
  }

  hasNext(): boolean {
    return (
      this.autoplayEnabled.value &&
      this.currentArtistQueue.length > 0 &&
      this.currentIndex < this.currentArtistQueue.length - 1
    );
  }

  getCurrentQueue(): Media[] {
    return [...this.currentArtistQueue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  clearQueue(): void {
    this.currentArtistQueue = [];
    this.currentIndex = 0;
    this.currentArtist = '';
    this.currentCategory = '';
  }
}
