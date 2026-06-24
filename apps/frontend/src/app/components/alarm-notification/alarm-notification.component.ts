import { Component, inject, Input } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { ClientStore } from '../../stores/client.store';
import { Alarm } from '@sonos-jukebox/shared';

@Component({
  selector: 'app-alarm-notification',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonLabel],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>Wecker</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <div style="padding: 32px 16px">
        <div style="font-size: 3rem; margin-bottom: 8px">⏰</div>
        <h2>{{ alarm.name }}</h2>
        <p style="font-size: 2rem; font-weight: bold">{{ alarm.time }}</p>
      </div>
      <div style="display: flex; gap: 16px; justify-content: center; padding: 16px">
        <ion-button color="medium" (click)="onSnooze()">
          Snooze (10 min)
        </ion-button>
        <ion-button color="danger" (click)="onStop()">
          Stopp
        </ion-button>
      </div>
    </ion-content>
  `,
})
export class AlarmNotificationComponent {
  @Input() alarm!: Alarm;

  private readonly api = inject(ApiService);
  private readonly clientStore = inject(ClientStore);
  private readonly modalCtrl = inject(ModalController);

  async onSnooze(): Promise<void> {
    const client = this.clientStore.currentClient();
    if (client) {
      await new Promise<void>((resolve) => {
        this.api.snoozeAlarm({ clientId: client.id, minutes: 10 }).subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
    }
    await this.modalCtrl.dismiss();
  }

  async onStop(): Promise<void> {
    const client = this.clientStore.currentClient();
    if (client) {
      await new Promise<void>((resolve) => {
        this.api.stopAlarm({ clientId: client.id }).subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
    }
    await this.modalCtrl.dismiss();
  }
}

export default AlarmNotificationComponent;
