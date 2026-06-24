import { Component, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonNote,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { backspaceOutline, closeOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonNote],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>PIN eingeben</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <div style="margin: 24px 0 16px">
        <span style="font-size: 2rem; letter-spacing: 16px">
          {{ displayPin() }}
        </span>
      </div>

      @if (errorMessage()) {
        <ion-note color="danger" style="display:block; margin-bottom: 12px">
          {{ errorMessage() }}
        </ion-note>
      }

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 280px; margin: 0 auto">
        @for (digit of ['1','2','3','4','5','6','7','8','9']; track digit) {
          <ion-button expand="block" (click)="onDigit(digit)" [disabled]="loading()">
            {{ digit }}
          </ion-button>
        }
        <ion-button expand="block" (click)="onDigit('0')" [disabled]="loading()">0</ion-button>
        <ion-button expand="block" color="medium" (click)="onDelete()" [disabled]="loading()">
          <ion-icon name="backspace-outline" slot="icon-only"></ion-icon>
        </ion-button>
        <ion-button expand="block" color="primary" (click)="onSubmit()" [disabled]="pin().length === 0 || loading()">
          OK
        </ion-button>
      </div>
    </ion-content>
  `,
})
export class PinDialogPage {
  private readonly api = inject(ApiService);
  private readonly modalCtrl = inject(ModalController);

  readonly pin = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    addIcons({ backspaceOutline, closeOutline });
  }

  displayPin(): string {
    return '●'.repeat(this.pin().length) || '○○○○';
  }

  onDigit(d: string): void {
    if (this.pin().length >= 8) return;
    this.pin.update((p) => p + d);
    this.errorMessage.set('');
  }

  onDelete(): void {
    this.pin.update((p) => p.slice(0, -1));
  }

  async onSubmit(): Promise<void> {
    if (!this.pin()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const result = await new Promise<{ access_token: string }>((resolve, reject) => {
        this.api.login(this.pin()).subscribe({ next: resolve, error: reject });
      });
      await this.modalCtrl.dismiss({ token: result.access_token });
    } catch {
      this.errorMessage.set('Falscher PIN. Bitte erneut versuchen.');
      this.pin.set('');
    } finally {
      this.loading.set(false);
    }
  }

  async close(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}

export default PinDialogPage;
