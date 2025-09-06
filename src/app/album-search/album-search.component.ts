import { Component, Output, EventEmitter } from '@angular/core';
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

  constructor(private spotifyService: SpotifyService) {}

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
    this.albumSelected.emit(album);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchResults = [];
  }
}