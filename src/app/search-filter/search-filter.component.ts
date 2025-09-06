import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.scss']
})
export class SearchFilterComponent implements OnInit {
  @Input() placeholder = 'Search...';
  @Output() searchChange = new EventEmitter<string>();

  searchTerm = '';
  isVisible = false;

  ngOnInit() {}

  toggleSearch() {
    this.isVisible = !this.isVisible;
    if (!this.isVisible) {
      this.clearSearch();
    }
  }

  onSearchChange() {
    this.searchChange.emit(this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchChange.emit('');
  }
}