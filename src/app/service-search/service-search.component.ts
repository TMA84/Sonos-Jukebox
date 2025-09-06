import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController } from '@ionic/angular';
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

  serviceConfig = {
    applemusic: { name: 'Apple Music', placeholder: 'Search Apple Music...' },
    amazonmusic: { name: 'Amazon Music', placeholder: 'Search Amazon Music...' },
    tunein: { name: 'TuneIn Radio', placeholder: 'Search radio stations...' }
  };

  constructor(private modalController: ModalController) { }

  onSearch() {
    if (!this.searchTerm.trim()) return;
    
    this.isSearching = true;
    // Simulate search results for demo
    setTimeout(() => {
      this.searchResults = this.generateMockResults();
      this.isSearching = false;
    }, 1000);
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
}