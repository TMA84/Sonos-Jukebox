import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Media } from '../media';

@Component({
  selector: 'app-service-search',
  templateUrl: './service-search.component.html',
  styleUrls: ['./service-search.component.scss']
})
export class ServiceSearchComponent {
  @Input() service: 'applemusic' | 'amazonmusic' | 'tunein' | 'spotify' = 'applemusic';
  @Input() category = 'audiobook';
  @Input() searchType = 'album'; // Can be set from parent component
  @Output() albumSelected = new EventEmitter<Media>();
  
  searchTerm = '';
  searchResults: any[] = [];
  isSearching = false;
  showKeyboard = false;
  activeInput = 'search';

  serviceConfig = {
    applemusic: { name: 'Apple Music', placeholder: 'Search Apple Music...' },
    amazonmusic: { name: 'Amazon Music', placeholder: 'Search Amazon Music...' },
    tunein: { name: 'TuneIn Radio', placeholder: 'Search radio stations...' },
    spotify: { name: 'Spotify', placeholder: 'Search Spotify...' }
  };

  constructor(
    private modalController: ModalController,
    private http: HttpClient
  ) { }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }
    
    this.isSearching = true;
    let searchUrl: string;
    let params: any;
    
    if (this.service === 'tunein') {
      searchUrl = environment.production ? `../api/tunein/search/stations` : `http://localhost:8200/api/tunein/search/stations`;
      params = { q: this.searchTerm, limit: '20' };
    } else {
      searchUrl = environment.production ? `../api/search/${this.service}` : `http://localhost:8200/api/search/${this.service}`;
      params = { 
        query: this.searchTerm,
        type: this.searchType
      };
    }
    
    this.http.get<any>(searchUrl, { params }).subscribe({
      next: (response) => {
        console.log('TuneIn search response:', response);
        if (this.service === 'tunein') {
          this.searchResults = response.stations.items.map((station: any) => {
            console.log('Station data:', station);
            return {
              id: station.id,
              title: station.name,
              artist: station.genre,
              cover: `https://cdn-profiles.tunein.com/${station.id}/images/logod.jpg`,
              streamUrl: station.streamUrl
            };
          });
        } else {
          this.searchResults = this.searchType === 'show' ? response.shows : response.albums;
        }
        console.log('Final search results:', this.searchResults);
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.searchResults = this.generateMockResults();
        this.isSearching = false;
      }
    });
  }

  generateMockResults(): any[] {
    const results = [];
    for (let i = 1; i <= 5; i++) {
      results.push({
        id: `${this.service}_${i}`,
        title: `${this.searchTerm} Result ${i}`,
        artist: this.service === 'tunein' ? 'Radio Station' : `Artist ${i}`,
        cover: '../assets/images/nocover.png'
      });
    }
    return results;
  }

  selectAlbum(result: any) {
    const media: Media = {
      id: result.id,
      title: result.title,
      artist: result.artist,
      cover: result.cover,
      type: this.service,
      category: this.category
    };
    this.modalController.dismiss(media);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchResults = [];
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

  setActiveInput(input: string) {
    this.activeInput = input;
  }

  addKey(key: string) {
    if (this.activeInput === 'search') {
      this.searchTerm += key;
      this.onSearch();
    }
  }

  backspace() {
    if (this.activeInput === 'search') {
      this.searchTerm = this.searchTerm.slice(0, -1);
      this.onSearch();
    }
  }

  nextInput() {
    // Only one input in this component
    this.activeInput = 'search';
  }

  toggleSearchType() {
    // This method is called when the segment changes
    if (this.searchTerm.trim()) {
      this.onSearch();
    }
  }

  private getTuneInStationImage(stationId: string): string {
    const id = stationId?.replace('s', '');
    return id ? `https://cdn-radiotime-logos.tunein.com/${id}q.png` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNOC4yNSAxNi4yNWMtLjQxNC0uNDE0LS40MTQtMS4wODYgMC0xLjVhNS4yNSA1LjI1IDAgMCAxIDcuNSAwYy40MTQuNDE0LjQxNCAxLjA4NiAwIDEuNXMtMS4wODYuNDE0LTEuNSAwYTIuMjUgMi4yNSAwIDAgMC0zIDAgYy0uNDE0LjQxNC0xLjA4Ni40MTQtMS41IDB6IiBmaWxsPSIjMzM3M2RjIi8+CjxwYXRoIGQ9Ik02IDIwYy0uNTUyIDAtMS0uNDQ4LTEtMXMuNDQ4LTEgMS0xYzMuMzE0IDAgNi0yLjY4NiA2LTZzMi42ODYtNiA2LTZjLjU1MiAwIDEgLjQ0OCAxIDFzLS40NDggMS0xIDFjLTIuMjEgMC00IDEuNzktNCA0cy0xLjc5IDQtNCA0eiIgZmlsbD0iIzMzNzNkYyIvPgo8L3N2Zz4K';
  }
}