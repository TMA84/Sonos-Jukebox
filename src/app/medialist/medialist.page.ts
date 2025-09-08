import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MediaService } from '../media.service';
import { ArtworkService } from '../artwork.service';
import { PlayerService } from '../player.service';
import { Media } from '../media';
import { Artist } from '../artist';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-medialist',
  templateUrl: './medialist.page.html',
  styleUrls: ['./medialist.page.scss'],
})
export class MedialistPage implements OnInit {
  artist: Artist;
  media: Media[] = [];
  allMedia: Media[] = [];
  covers = {};
  isLoading = false;
  hasMoreAlbums = true;
  offset = 0;
  limit = 20;
  searchTerm = '';
  showSearch = false;
  searchResults: Media[] = [];
  searchOffset = 0;
  showKeyboard = false;
  isUpperCase = false;
  activeInput = '';
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];
  showError = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private mediaService: MediaService,
    private artworkService: ArtworkService,
    private playerService: PlayerService
  ) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.artist = this.router.getCurrentNavigation().extras.state.artist;
      }
    });
  }

  ngOnInit() {
    this.loadMediaFromArtist();
  }

  loadMediaFromArtist() {
    // Load albums from raw data first to get artist ID
    const url = (environment.production) ? '../api/data' : 'http://localhost:8200/api/data';
    const clientId = this.getArtistClientId();
    
    this.http.get<Media[]>(url, {
      params: { clientId }
    }).subscribe({
      next: (rawMedia) => {
        // Find the artist entry in raw data
        const artistEntry = rawMedia.find(item => 
          item.artist === this.artist.name && 
          (item.category || 'audiobook') === (this.artist.coverMedia?.category || 'audiobook')
        );
        
        if (artistEntry && artistEntry.artistid) {
          // Load albums from Spotify API
          this.fetchArtistAlbums(artistEntry.artistid);
        } else {
          console.error('No artist ID found for:', this.artist.name);
          this.allMedia = [];
          this.media = [];
        }
      },
      error: (err) => {
        console.error('Failed to load raw media data:', err);
        this.allMedia = [];
        this.media = [];
      }
    });
  }

  fetchArtistAlbums(artistId: string, loadMore = false, retryCount = 0): Promise<void> {
    return new Promise((resolve) => {
      if (this.isLoading || (!loadMore && !this.hasMoreAlbums)) {
        resolve();
        return;
      }
      
      this.isLoading = true;
      const searchUrl = environment.production ? '../api/spotify/artist-albums' : 'http://localhost:8200/api/spotify/artist-albums';
      
      this.http.get<any>(`${searchUrl}?artistId=${artistId}&offset=${this.offset}&limit=${this.limit}`).subscribe({
        next: (response) => {
          if (response.albums && response.albums.items) {
            const newAlbums = response.albums.items.map(album => ({
              artist: this.artist.name,
              title: album.name,
              type: 'spotify',
              category: this.artist.coverMedia.category || 'music',
              cover: album.images && album.images[0] ? album.images[0].url : this.artist.coverMedia.cover,
              id: album.id,
              contentType: 'album'
            }));
            
            if (loadMore) {
              this.allMedia = [...this.allMedia, ...newAlbums];
            } else {
              this.allMedia = newAlbums;
            }
            this.media = this.allMedia;
            
            this.hasMoreAlbums = response.albums.next !== null;
            this.offset += this.limit;
            
            this.loadArtworkBatch(newAlbums.slice(0, 12));
          } else {
            this.hasMoreAlbums = false;
          }
          
          this.isLoading = false;
          console.log('Fetched albums for artist:', this.artist.name, 'Total:', this.media.length);
          resolve();
        },
        error: (err) => {
          console.error('Failed to fetch artist albums:', err);
          this.isLoading = false;
          
          // Retry up to 3 times with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
            setTimeout(() => {
              this.fetchArtistAlbums(artistId, loadMore, retryCount + 1).then(resolve);
            }, delay);
          } else {
            console.error('Max retries reached, showing error message');
            this.hasMoreAlbums = false;
            this.showError = true;
            if (err.status === 429) {
              this.errorMessage = 'Spotify rate limit reached. Please wait a moment and try again.';
            } else if (err.status === 401) {
              this.errorMessage = 'Spotify authentication failed. Please check your Spotify credentials in settings.';
            } else if (err.status === 404) {
              this.errorMessage = 'Artist not found on Spotify. This artist may not be available.';
            } else if (err.status === 500 && err.error?.error === 'Spotify not configured') {
              this.errorMessage = 'Spotify is not configured. Please add your Spotify credentials in settings.';
            } else {
              this.errorMessage = `Unable to load albums: ${err.error?.error || err.message || 'Network or server error'}`;
            }
            if (!loadMore) {
              this.allMedia = [];
              this.media = [];
            }
            resolve();
          }
        }
      });
    });
  }

  loadMoreAlbums(event?: any) {
    console.log('loadMoreAlbums called, searchTerm:', this.searchTerm.trim());
    console.log('hasMoreAlbums:', this.hasMoreAlbums, 'isLoading:', this.isLoading);
    
    // Handle search results pagination
    if (this.searchTerm.trim()) {
      console.log('Loading more search results...');
      const hasMore = this.loadMoreSearchResults();
      if (event) {
        event.target.complete();
        if (!hasMore) {
          event.target.disabled = true;
        }
      }
      return;
    }
    
    // Handle normal album loading - find artist ID from raw data
    if (this.hasMoreAlbums && !this.isLoading) {
      const url = (environment.production) ? '../api/data' : 'http://localhost:8200/api/data';
      const clientId = this.getArtistClientId();
      
      this.http.get<Media[]>(url, {
        params: { clientId }
      }).subscribe({
        next: (rawMedia) => {
          const artistEntry = rawMedia.find(item => 
            item.artist === this.artist.name && 
            (item.category || 'audiobook') === (this.artist.coverMedia?.category || 'audiobook')
          );
          
          if (artistEntry && artistEntry.artistid) {
            this.fetchArtistAlbums(artistEntry.artistid, true).then(() => {
              if (event) {
                event.target.complete();
              }
            });
          } else {
            console.log('No artist ID found for loading more albums');
            if (event) {
              event.target.complete();
              event.target.disabled = true;
            }
          }
        },
        error: (err) => {
          console.error('Failed to load raw media for more albums:', err);
          if (event) {
            event.target.complete();
          }
        }
      });
    } else if (event) {
      event.target.complete();
      if (!this.hasMoreAlbums) {
        event.target.disabled = true;
      }
    }
  }

  coverClicked(clickedMedia: Media) {
    const navigationExtras: NavigationExtras = {
      state: {
        media: clickedMedia
      }
    };
    this.router.navigate(['/player'], navigationExtras);
  }

  mediaNameClicked(clickedMedia: Media) {
    this.playerService.getConfig().subscribe(config => {
      if (config.tts == null || config.tts.enabled === true) {
        this.playerService.say(clickedMedia.title);
      }
    });
  }

  private loadArtworkBatch(items: Media[]) {
    items.forEach(currentMedia => {
      this.artworkService.getArtwork(currentMedia).subscribe(url => {
        this.covers[currentMedia.title] = url;
      });
    });
  }

  loadMoreArtwork(items: Media[]) {
    this.loadArtworkBatch(items);
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.onSearch();
    }
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.media = this.allMedia;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const filteredResults = this.allMedia.filter(album => 
      album.title.toLowerCase().includes(term)
    );
    
    // Show first 20 search results
    this.media = filteredResults.slice(0, 20);
    this.searchResults = filteredResults;
    this.searchOffset = 20;
  }

  loadMoreSearchResults() {
    console.log('Loading more search results:', this.searchOffset, 'of', this.searchResults.length);
    
    if (!this.searchResults || this.searchOffset >= this.searchResults.length) {
      console.log('No more search results to load');
      return false;
    }
    
    const nextBatch = this.searchResults.slice(this.searchOffset, this.searchOffset + 20);
    console.log('Adding', nextBatch.length, 'more search results');
    this.media = [...this.media, ...nextBatch];
    this.searchOffset += 20;
    
    const hasMore = this.searchOffset < this.searchResults.length;
    console.log('Has more search results:', hasMore);
    return hasMore;
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  setActiveInput(input: string) {
    this.activeInput = input;
  }

  addKey(key: string) {
    const keyToAdd = this.isUpperCase ? key.toUpperCase() : key;
    switch (this.activeInput) {
      case 'search':
        this.searchTerm += keyToAdd;
        this.onSearch();
        break;
    }
  }

  backspace() {
    switch (this.activeInput) {
      case 'search':
        this.searchTerm = this.searchTerm.slice(0, -1);
        this.onSearch();
        break;
    }
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }

  getArtistClientId(): string {
    // Try to get client ID from artist data, fallback to current client
    if (this.artist.clientId) {
      return this.artist.clientId;
    }
    return localStorage.getItem('clientId') || 'default';
  }

  retryLoadAlbums() {
    this.showError = false;
    this.errorMessage = '';
    this.offset = 0;
    this.hasMoreAlbums = true;
    this.loadMediaFromArtist();
  }
}
