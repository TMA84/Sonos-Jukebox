import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { SpotifyService } from '../spotify.service';
import { TuneInService, TuneInStation } from '../tunein.service';
import { environment } from '../../environments/environment';

export type SearchMode = 'album' | 'artist' | 'podcast' | 'audiobook' | 'radio';

@Component({
  selector: 'app-unified-search',
  templateUrl: './unified-search.component.html',
  styleUrls: ['./unified-search.component.scss'],
})
export class UnifiedSearchComponent implements OnInit {
  @Input() mode: SearchMode = 'album';
  @Input() source: string = 'spotify';
  @Input() category: string = 'audiobook';

  searchTerm = '';
  results: any[] = [];
  isSearching = false;
  showKeyboard = false;

  private searchTimeout: any;

  get title(): string {
    const titles: Record<SearchMode, string> = {
      album: 'Search Albums',
      artist: 'Search Artists',
      podcast: 'Search Podcasts',
      audiobook: 'Search Audiobooks',
      radio: 'Search Radio Stations',
    };
    return titles[this.mode] || 'Search';
  }

  get placeholder(): string {
    const ph: Record<SearchMode, string> = {
      album: 'Album or artist name...',
      artist: 'Artist name...',
      podcast: 'Podcast name...',
      audiobook: 'Audiobook title...',
      radio: 'Station name...',
    };
    return ph[this.mode] || 'Search...';
  }

  get icon(): string {
    const icons: Record<SearchMode, string> = {
      album: 'disc',
      artist: 'person',
      podcast: 'mic',
      audiobook: 'book',
      radio: 'radio',
    };
    return icons[this.mode] || 'search';
  }

  constructor(
    private modalController: ModalController,
    private spotifyService: SpotifyService,
    private tuneInService: TuneInService,
    private http: HttpClient
  ) {}

  ngOnInit() {}

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    if (!this.searchTerm.trim()) {
      this.results = [];
      return;
    }
    this.searchTimeout = setTimeout(() => this.doSearch(), 400);
  }

  private doSearch() {
    if (!this.searchTerm.trim()) return;
    this.isSearching = true;

    if (this.mode === 'radio') {
      this.searchRadio();
    } else if (this.mode === 'artist') {
      this.searchArtists();
    } else if (this.mode === 'podcast' || this.mode === 'audiobook') {
      this.searchService();
    } else {
      this.searchAlbums();
    }
  }

  private searchAlbums() {
    this.spotifyService.searchAlbums(this.searchTerm).subscribe({
      next: items => {
        this.results = items.map(a => ({
          id: a.id,
          title: a.title,
          subtitle: a.artist,
          image: a.cover,
          raw: a,
        }));
        this.isSearching = false;
      },
      error: () => {
        this.results = [];
        this.isSearching = false;
      },
    });
  }

  private searchArtists() {
    this.spotifyService.searchArtists(this.searchTerm).subscribe({
      next: items => {
        this.results = items.map(a => ({
          id: a.id,
          title: a.name,
          subtitle: a.followers ? `${a.followers.toLocaleString()} followers` : '',
          image: a.image,
          raw: a,
        }));
        this.isSearching = false;
      },
      error: () => {
        this.results = [];
        this.isSearching = false;
      },
    });
  }

  private searchRadio() {
    this.tuneInService.searchStations(this.searchTerm, 20).subscribe({
      next: response => {
        this.results = response.stations.items.map((s: TuneInStation) => ({
          id: s.id,
          title: s.name,
          subtitle: s.genre,
          image: s.image,
          raw: s,
        }));
        this.isSearching = false;
      },
      error: () => {
        this.results = [];
        this.isSearching = false;
      },
    });
  }

  private searchService() {
    const searchType = this.mode === 'podcast' ? 'show' : 'audiobook';
    const searchUrl = `${environment.apiUrl}/search/${this.source}`;
    this.http
      .get<any>(searchUrl, {
        params: { query: this.searchTerm, type: searchType },
      })
      .subscribe({
        next: response => {
          const items = searchType === 'show' ? response.shows : response.audiobooks;
          this.results = (items || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            subtitle: r.artist || '',
            image: r.cover,
            raw: r,
          }));
          this.isSearching = false;
        },
        error: () => {
          this.results = [];
          this.isSearching = false;
        },
      });
  }

  selectResult(item: any) {
    this.modalController.dismiss(item.raw);
  }

  clearSearch() {
    this.searchTerm = '';
    this.results = [];
  }

  closeModal() {
    this.modalController.dismiss();
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  addKey(key: string) {
    this.searchTerm += key;
    this.onSearchInput();
  }

  backspace() {
    this.searchTerm = this.searchTerm.slice(0, -1);
    this.onSearchInput();
  }
}
