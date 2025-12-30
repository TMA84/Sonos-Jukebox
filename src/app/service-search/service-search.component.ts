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
  @Input() service: 'applemusic' | 'amazonmusic' | 'tunein' = 'applemusic';
  @Input() category = 'audiobook';
  @Output() albumSelected = new EventEmitter<Media>();
  
  searchTerm = '';
  searchResults: any[] = [];
  isSearching = false;
  showKeyboard = false;
  activeInput = 'search';

  serviceConfig = {
    applemusic: { name: 'Apple Music', placeholder: 'Search Apple Music...' },
    amazonmusic: { name: 'Amazon Music', placeholder: 'Search Amazon Music...' },
    tunein: { name: 'TuneIn Radio', placeholder: 'Search radio stations...' }
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
        type: 'album'
      };
    }
    
    this.http.get<any>(searchUrl, { params }).subscribe({
      next: (response) => {
        if (this.service === 'tunein') {
          this.searchResults = response.stations.items.map((station: any) => ({
            id: station.id,
            title: station.name,
            artist: station.genre,
            cover: station.image,
            streamUrl: station.streamUrl
          }));
        } else {
          this.searchResults = response.albums;
        }
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
}