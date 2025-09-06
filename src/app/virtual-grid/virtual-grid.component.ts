import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Media } from '../media';
import { Artist } from '../artist';

@Component({
  selector: 'app-virtual-grid',
  templateUrl: './virtual-grid.component.html',
  styleUrls: ['./virtual-grid.component.scss']
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
  currentPage = 0;
  hasMore = true;
  searchTerm = '';

  ngOnChanges() {
    this.reset();
  }

  reset() {
    this.displayedItems = [];
    this.currentPage = 0;
    this.applyFilter();
    this.loadMore();
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase();
    this.reset();
  }

  private applyFilter() {
    this.filteredItems = this.searchTerm ? 
      this.items.filter(item => this.getItemTitle(item).toLowerCase().includes(this.searchTerm)) :
      this.items;
    this.hasMore = this.filteredItems.length > 0;
  }

  loadMore() {
    if (!this.hasMore) return;

    const start = this.currentPage * this.itemsPerPage;
    const newItems = this.filteredItems.slice(start, start + this.itemsPerPage);
    
    this.displayedItems.push(...newItems);
    this.currentPage++;
    this.hasMore = start + this.itemsPerPage < this.filteredItems.length;
    
    this.loadMoreArtwork.emit(newItems);
  }



  getItemTitle(item: Media | Artist): string {
    return 'name' in item ? item.name : item.title;
  }

  getItemCover(item: Media | Artist): string {
    const key = this.getItemTitle(item);
    return this.covers[key] || '../assets/images/nocover.png';
  }

  onInfiniteScroll(event: any) {
    this.loadMore();
    event.target.complete();
  }

  trackByFn(index: number, item: Media | Artist): string {
    return 'name' in item ? item.name : `${item.artist}-${item.title}`;
  }
}