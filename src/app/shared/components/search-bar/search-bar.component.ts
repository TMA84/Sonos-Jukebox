import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-toolbar>
      <ion-searchbar
        [value]="searchQuery"
        (ionInput)="onSearchInput($event)"
        (ionClear)="onClear()"
        placeholder="Search..."
        [debounce]="300"
      ></ion-searchbar>
    </ion-toolbar>
  `,
})
export class SearchBarComponent {
  @Input() searchQuery = '';
  @Output() searchChange = new EventEmitter<string>();

  onSearchInput(event: any) {
    this.searchChange.emit(event.target.value);
  }

  onClear() {
    this.searchChange.emit('');
  }
}
