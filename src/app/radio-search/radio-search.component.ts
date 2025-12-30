import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TuneInService, TuneInStation } from '../tunein.service';

@Component({
  selector: 'app-radio-search',
  templateUrl: './radio-search.component.html',
  styleUrls: ['./radio-search.component.scss']
})
export class RadioSearchComponent {
  @Input() isVisible = false;
  @Output() stationSelected = new EventEmitter<TuneInStation>();
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  searchResults: TuneInStation[] = [];
  isLoading = false;

  constructor(private tuneInService: TuneInService) {}

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    if (this.searchQuery.length > 2) {
      this.searchStations();
    } else {
      this.searchResults = [];
    }
  }

  searchStations() {
    if (!this.searchQuery.trim()) return;

    this.isLoading = true;
    this.tuneInService.searchStations(this.searchQuery, 20).subscribe({
      next: (response) => {
        this.searchResults = response.stations.items;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Radio search error:', error);
        this.isLoading = false;
      }
    });
  }

  selectStation(station: TuneInStation) {
    this.stationSelected.emit(station);
    this.closeModal();
  }

  closeModal() {
    this.searchQuery = '';
    this.searchResults = [];
    this.close.emit();
  }
}
