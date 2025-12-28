import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-segment
      [value]="selectedCategory"
      (ionChange)="onCategoryChange($event)"
      scrollable
    >
      @for (category of categories; track category.value) {
        <ion-segment-button [value]="category.value">
          <ion-label>{{ category.label }}</ion-label>
        </ion-segment-button>
      }
    </ion-segment>
  `,
  styles: [`
    ion-segment {
      --background: var(--ion-color-light);
    }
  `],
})
export class CategoryTabsComponent {
  @Input() selectedCategory = 'audiobook';
  @Output() categoryChange = new EventEmitter<string>();

  categories = [
    { value: 'audiobook', label: 'Audiobooks' },
    { value: 'music', label: 'Music' },
    { value: 'playlist', label: 'Playlists' },
    { value: 'radio', label: 'Radio' },
  ];

  onCategoryChange(event: any) {
    this.categoryChange.emit(event.detail.value);
  }
}
