import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, iif, Subject } from 'rxjs';
import { map, mergeMap, tap, toArray, mergeAll, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { SpotifyService } from './spotify.service';
import { ClientService } from './client.service';
import { Media } from './media';
import { Artist } from './artist';

@Injectable({
  providedIn: 'root'
})
export class MediaService {

  private category = 'audiobook';
  private mediaCache = new Map<string, Media[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private backgroundLoading = false;

  private rawMediaSubject = new Subject<Media[]>();

  private artistSubject = new Subject<Media[]>();
  private mediaSubject = new Subject<Media[]>();
  private artistMediaSubject = new Subject<Media[]>();

  constructor(
    private http: HttpClient,
    private spotifyService: SpotifyService,
    private clientService: ClientService
  ) { }

  // --------------------------------------------
  // Handling of RAW media entries from data.json
  // --------------------------------------------

  getRawMediaObservable() {
    return this.rawMediaSubject;
  }

  updateRawMedia() {
    const url = (environment.production) ? '../api/data' : 'http://localhost:8200/api/data';
    this.http.get<Media[]>(url, {
      params: { clientId: this.clientService.getClientId() }
    }).subscribe(media => {
        this.rawMediaSubject.next(media);
        // Disabled background loading to prevent rate limiting
        // this.preloadAllCategories(media);
    });
  }

  deleteRawMediaAtIndex(index: number) {
    const url = (environment.production) ? '../api/delete' : 'http://localhost:8200/api/delete';
    const body = {
      index,
      clientId: this.clientService.getClientId()
    };

    this.http.post(url, body).subscribe(response => {
      // Clear cache to force reload of updated data
      this.clearCache();
      this.updateRawMedia();
    });
  }

  addRawMedia(media: Media) {
    const url = (environment.production) ? '../api/add' : 'http://localhost:8200/api/add';
    const mediaWithClient = { ...media, clientId: this.clientService.getClientId() };

    this.http.post(url, mediaWithClient).subscribe({
      next: (response) => {
        // Clear cache to force reload of updated data
        this.clearCache();
        this.updateRawMedia();
      },
      error: (error) => {
        console.error('Add failed:', error);
      }
    });
  }

  private clearCache() {
    this.mediaCache.clear();
    this.cacheExpiry.clear();
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCacheData(key: string, data: Media[]): void {
    this.mediaCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private preloadAllCategories(rawMedia: Media[]) {
    if (this.backgroundLoading) return;
    this.backgroundLoading = true;
    
    const categories = ['audiobook', 'music', 'playlist', 'radio'];
    categories.forEach((category, index) => {
      const cacheKey = `${this.clientService.getClientId()}_${category}`;
      if (!this.isCacheValid(cacheKey)) {
        // Stagger the background loading with smaller delays
        setTimeout(() => this.loadCategoryInBackground(rawMedia, category), index * 1000);
      }
    });
  }

  private loadCategoryInBackground(rawMedia: Media[], category: string) {
    const cacheKey = `${this.clientService.getClientId()}_${category}`;
    this.processMediaForCategory(rawMedia, category).subscribe((media: Media[]) => {
      this.setCacheData(cacheKey, media);
    });
  }

  // Get the media data for the current category from the server
  private updateMedia() {
    const cacheKey = `${this.clientService.getClientId()}_${this.category}`;
    
    // Return cached data if valid
    if (this.isCacheValid(cacheKey)) {
      return of(this.mediaCache.get(cacheKey) || []);
    }

    const url = (environment.production) ? '../api/data' : 'http://localhost:8200/api/data';

    return this.http.get<Media[]>(url, {
      params: { clientId: this.clientService.getClientId() }
    }).pipe(
      mergeMap(rawMedia => this.processMediaForCategory(rawMedia, this.category))
    );
  }

  private processMediaForCategory(rawMedia: Media[], category: string) {
    return of(rawMedia).pipe(
      map(items => { // Filter to get only items for the chosen category
        items.forEach(item => item.category = (item.category === undefined) ? 'audiobook' : item.category); // default category
        items = items.filter(item => item.category === category);
        return items;
      }),
      mergeMap(items => from(items)), // parallel calls for each item
      mergeMap((item) => { // get media for the current item with error handling

        
        let mediaObservable: Observable<Media[]>;
        
        if (item.query && item.query.length > 0) {
          // Get media by query
          mediaObservable = this.spotifyService.getMediaByQuery(item.query, item.category).pipe(
            map(items => {

              if (item.artist?.length > 0) {
                items.forEach(currentItem => {
                  currentItem.artist = item.artist;
                });
              }
              return items;
            })
          );
        } else if (item.artistid && item.artistid.length > 0) {
          // Get media by artist, fallback to track search if no albums/singles found
          mediaObservable = this.spotifyService.getMediaByArtistID(item.artistid, item.category).pipe(
            mergeMap(items => {
              if (items.length === 0) {
                return this.spotifyService.searchTracks(`artist:${item.artist}`, item.category);
              }
              return of(items);
            }),
            map(items => {
              if (item.artist?.length > 0) {
                items.forEach(currentItem => {
                  currentItem.artist = item.artist;
                });
              }
              return items;
            })
          );
        } else if (item.type === 'spotify' && item.id && item.id.length > 0) {
          // Get media by album
          mediaObservable = this.spotifyService.getMediaByID(item.id, item.category).pipe(
            map(currentItem => {

              if (item.artist?.length > 0) {
                currentItem.artist = item.artist;
              }
              if (item.title?.length > 0) {
                currentItem.title = item.title;
              }
              return [currentItem];
            })
          );
        } else {
          // Single album - return as array
          mediaObservable = of([item]);
        }
        
        return mediaObservable.pipe(

          catchError(error => {
            console.error(`Error processing ${item.artist}:`, error);
            return of([]); // Return empty array on error to continue processing other artists
          })
        );
      }),
      mergeMap(items => from(items)), // separate arrays to single observables
      toArray(), // convert to array
      map((media: Media[]) => { // add dummy image for missing covers
        const processedMedia = media.map((currentMedia: Media) => {
          if (!currentMedia.cover) {
            currentMedia.cover = '../assets/images/nocover.png';
          }
          return currentMedia;
        });
        
        // Cache the processed data
        const currentCacheKey = `${this.clientService.getClientId()}_${category}`;
        this.setCacheData(currentCacheKey, processedMedia);

        return processedMedia;
      })
    );
  }

  publishArtists() {
    this.getArtists().subscribe((artists: Artist[]) => {
      // Convert artists back to media format for compatibility
      const media = artists.map(artist => artist.coverMedia);
      this.artistSubject.next(media);
    });
  }

  publishMedia() {
    this.updateMedia().subscribe((media: Media[]) => {
      this.mediaSubject.next(media);
    });
  }

  publishArtistMedia() {
    this.updateMedia().subscribe((media: Media[]) => {
      this.artistMediaSubject.next(media);
    });
  }

  // Get all artists for the current category (optimized - no album loading)
  getArtists(): Observable<Artist[]> {
    const url = (environment.production) ? '../api/data' : 'http://localhost:8200/api/data';
    
    return this.http.get<Media[]>(url, {
      params: { clientId: this.clientService.getClientId() }
    }).pipe(
      map(rawMedia => {
        // Filter for current category
        const items = rawMedia
          .map(item => ({ ...item, category: item.category || 'audiobook' }))
          .filter(item => item.category === this.category);
        
        // Create artists from raw data without loading albums
        const artistMap = new Map<string, Artist>();
        
        items.forEach(item => {
          if (item.artist && !artistMap.has(item.artist)) {
            artistMap.set(item.artist, {
              name: item.artist,
              albumCount: '0', // Will be loaded on-demand
              cover: item.cover || '../assets/images/nocover.png',
              coverMedia: {
                id: item.id || '',
                artist: item.artist,
                title: item.title || item.artist,
                cover: item.cover || '../assets/images/nocover.png',
                type: item.type || 'spotify',
                category: item.category,
                ...(item.category === 'radio' && item.metadata ? { metadata: item.metadata } : {})
              }
            });
          }
        });
        
        return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  // Collect albums from a given artist in the current category
  getMediaFromArtist(artist: Artist): Observable<Media[]> {
    return this.artistMediaSubject.pipe(
      map((media: Media[]) => {
        return media
          .filter(currentMedia => currentMedia.artist === artist.name)
          .sort((a, b) => a.title.localeCompare(b.title, undefined, {
            numeric: true,
            sensitivity: 'base'
          }));
      })
    );
  }

  // Get all media entries for the current category
  getMedia(): Observable<Media[]> {
    return this.mediaSubject.pipe(
      map((media: Media[]) => {
        return media
          .sort((a, b) => a.title.localeCompare(b.title, undefined, {
            numeric: true,
            sensitivity: 'base'
          }));
      })
    );
  }

    // Choose which media category should be displayed in the app
    setCategory(category: string) {
      this.category = category;
    }
}
