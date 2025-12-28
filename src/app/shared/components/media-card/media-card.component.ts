import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card class="media-card" (click)="onClick()">
      <div class="cover-container">
        <img
          [src]="cover || 'assets/images/nocover.png'"
          [alt]="title"
          (error)="onImageError($event)"
        />
      </div>
      <ion-card-content>
        <h3 (click)="onTitleClick($event)">{{ title }}</h3>
        @if (subtitle) {
          <p>{{ subtitle }}</p>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .media-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .media-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .cover-container {
      position: relative;
      padding-top: 100%;
      overflow: hidden;
      background: var(--ion-color-light);
    }

    .cover-container img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    ion-card-content {
      padding: 0.75rem;
    }

    h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      margin: 0;
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class MediaCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() cover = '';
  @Output() titleClick = new EventEmitter<void>();

  onClick() {
    // Card click is handled by parent
  }

  onTitleClick(event: Event) {
    event.stopPropagation();
    this.titleClick.emit();
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/nocover.png';
  }
}
