import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { Media } from '../media';
import { Artist } from '../artist';
import { ArtworkService } from '../artwork.service';

@Component({
  selector: 'app-virtual-grid',
  templateUrl: './virtual-grid.component.html',
  styleUrls: ['./virtual-grid.component.scss']
})
export class VirtualGridComponent implements OnInit, OnDestroy, OnChanges {
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

  constructor(private artworkService: ArtworkService) {}

  ngOnInit() {
    this.loadMore();
  }

  ngOnChanges() {
    this.reset();
  }

  ngOnDestroy() {}

  reset() {
    this.displayedItems = [];
    this.currentPage = 0;
    this.hasMore = true;
    this.applyFilter();
    this.loadMore();
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase();
    this.displayedItems = [];
    this.currentPage = 0;
    this.applyFilter();
    this.loadMore();
  }

  private applyFilter() {
    if (!this.searchTerm) {
      this.filteredItems = [...this.items];
    } else {
      this.filteredItems = this.items.filter(item => {
        const title = this.getItemTitle(item).toLowerCase();
        return title.includes(this.searchTerm);
      });
    }
    this.hasMore = this.filteredItems.length > 0;
  }

  loadMore() {
    if (!this.hasMore) return;

    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const newItems = this.filteredItems.slice(startIndex, endIndex);

    this.displayedItems = [...this.displayedItems, ...newItems];
    this.currentPage++;
    this.hasMore = endIndex < this.filteredItems.length;

    // Load artwork for new items
    this.loadMoreArtwork.emit(newItems);
  }

  onItemClick(item: Media | Artist) {
    this.itemClick.emit(item);
  }

  onNameClick(item: Media | Artist) {
    this.nameClick.emit(item);
  }

  getItemTitle(item: Media | Artist): string {
    return 'name' in item ? item.name : item.title;
  }

  getItemCover(item: Media | Artist): string {
    const key = 'name' in item ? item.name : item.title;
    const cover = this.covers[key];
    
    // If no cover is cached, load it lazily
    if (!cover && 'title' in item) {
      this.artworkService.getArtwork(item).subscribe(url => {
        this.covers[key] = url;
      });
    } else if (!cover && 'coverMedia' in item) {
      this.artworkService.getArtwork(item.coverMedia).subscribe(url => {
        this.covers[key] = url;
      });
    }
    
    return cover || '../assets/images/nocover.png';
  }

  trackByFn(index: number, item: Media | Artist): string {
    return 'name' in item ? item.name : `${item.artist}-${item.title}`;
  }
}