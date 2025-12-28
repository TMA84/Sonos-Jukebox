import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { ClientStore } from '../../../core/state/client.store';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Enter PIN</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="pin-container">
        <ion-input
          type="password"
          [(ngModel)]="pin"
          placeholder="Enter PIN"
          [maxlength]="4"
          inputmode="numeric"
          (keyup.enter)="verify()"
          data-cy="pin-input"
        ></ion-input>

        @if (error()) {
          <ion-text color="danger" data-cy="pin-error">
            <p>{{ error() }}</p>
          </ion-text>
        }

        <ion-button
          expand="block"
          (click)="verify()"
          [disabled]="loading()"
          data-cy="pin-submit"
        >
          @if (loading()) {
            <ion-spinner></ion-spinner>
          } @else {
            Verify
          }
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .pin-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 2rem auto;
    }

    ion-input {
      --background: var(--ion-color-light);
      --padding-start: 1rem;
      --padding-end: 1rem;
      border-radius: 8px;
    }
  `],
})
export class PinDialogComponent {
  private authService = inject(AuthService);
  private clientStore = inject(ClientStore);
  private modalController = inject(ModalController);

  pin = '';
  loading = signal(false);
  error = signal('');

  verify() {
    if (!this.pin) {
      this.error.set('Please enter a PIN');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const clientId = this.clientStore.currentClientId();

    this.authService.verifyPin(this.pin, clientId).subscribe({
      next: () => {
        this.loading.set(false);
        this.modalController.dismiss({ authenticated: true });
      },
      error: err => {
        this.loading.set(false);
        this.error.set('Invalid PIN');
      },
    });
  }

  dismiss() {
    this.modalController.dismiss({ authenticated: false });
  }
}
