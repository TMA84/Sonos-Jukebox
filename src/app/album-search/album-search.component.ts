import { Component, Output, EventEmitter } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SpotifyService } from '../spotify.service';
import { Media } from '../media';

@Component({
  selector: 'app-album-search',
  templateUrl: './album-search.component.html',
  styleUrls: ['./album-search.component.scss']
})
export class AlbumSearchComponent {
  @Output() albumSelected = new EventEmitter<Media>();
  
  searchTerm = '';
  searchResults: Media[] = [];
  isSearching = false;
  showKeyboard = false;
  isUpperCase = false;
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  constructor(
    private spotifyService: SpotifyService,
    private modalController: ModalController
  ) {}

  onSearch() {
    if (!this.searchTerm.trim()) return;
    
    this.isSearching = true;
    this.spotifyService.searchAlbums(this.searchTerm).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: () => {
        this.isSearching = false;
        this.searchResults = [];
      }
    });
  }

  selectAlbum(album: Media) {
    this.modalController.dismiss(album);
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

  addKey(key: string) {
    this.searchTerm += this.isUpperCase ? key.toUpperCase() : key;
    this.onSearch();
  }

  backspace() {
    this.searchTerm = this.searchTerm.slice(0, -1);
    this.onSearch();
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }
}