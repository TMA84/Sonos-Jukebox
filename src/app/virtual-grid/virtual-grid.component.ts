import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Media } from '../media';
import { Artist } from '../artist';

@Component({
  selector: 'app-virtual-grid',
  templateUrl: './virtual-grid.component.html',
  styleUrls: ['./virtual-grid.component.scss'],
})
export class VirtualGridComponent implements OnChanges {
  @Input() items: (Media | Artist)[] = [];
  @Input() covers: { [key: string]: string } = {};
  @Input() itemsPerPage = 12;
  @Output() itemClick = new EventEmitter<Media | Artist>();
  @Output() nameClick = new EventEmitter<Media | Artist>();
  @Output() loadMoreArtwork = new EventEmitter<(Media | Artist)[]>();

  displayedItems: (Media | Artist)[] = [];
  filteredItems: (Media | Artist)[] = [];
  searchTerm = '';
  lastLoadedCount = 0;

  ngOnChanges(changes: SimpleChanges) {
    this.applyFilter();
    this.displayedItems = this.filteredItems;

    // Load artwork for new items only
    if (this.filteredItems.length > this.lastLoadedCount) {
      const newItems = this.filteredItems.slice(this.lastLoadedCount);
      const itemsToLoad = newItems.slice(0, this.itemsPerPage);
      if (itemsToLoad.length > 0) {
        this.loadMoreArtwork.emit(itemsToLoad);
      }
      this.lastLoadedCount = this.filteredItems.length;
    }
  }

  reset() {
    this.lastLoadedCount = 0;
    this.applyFilter();
    this.displayedItems = this.filteredItems;

    // Load first batch of artwork
    const itemsToLoad = this.filteredItems.slice(0, this.itemsPerPage);
    if (itemsToLoad.length > 0) {
      this.loadMoreArtwork.emit(itemsToLoad);
    }
    this.lastLoadedCount = Math.min(this.itemsPerPage, this.filteredItems.length);
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase();
    this.reset();
  }

  private applyFilter() {
    this.filteredItems = this.searchTerm
      ? this.items.filter(item => this.getItemTitle(item).toLowerCase().includes(this.searchTerm))
      : this.items;
  }

  getItemTitle(item: Media | Artist): string {
    return 'name' in item ? item.name : item.title;
  }

  getItemCover(item: Media | Artist): string {
    const key = this.getItemTitle(item);
    return this.covers[key] || '../assets/images/nocover.png';
  }

  trackByFn(index: number, item: Media | Artist): string {
    return 'name' in item ? item.name : `${item.artist}-${item.title}`;
  }
}
