import { Injectable, inject, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { ApiService } from './api.service';
import { ClientStore } from '../stores/client.store';

@Injectable({ providedIn: 'root' })
export class AlarmNotificationService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly clientStore = inject(ClientStore);
  private readonly modalCtrl = inject(ModalController);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private modalOpen = false;

  startPolling(): void {
    this.intervalId = setInterval(() => this.checkForActiveAlarm(), 30_000);
  }

  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private async checkForActiveAlarm(): Promise<void> {
    const client = this.clientStore.currentClient();
    if (!client || this.modalOpen) return;

    this.api.getActiveAlarm(client.id).subscribe(async (alarm) => {
      if (!alarm || this.modalOpen) return;
      this.modalOpen = true;

      const { AlarmNotificationComponent } = await import(
        '../components/alarm-notification/alarm-notification.component'
      );
      const modal = await this.modalCtrl.create({
        component: AlarmNotificationComponent,
        componentProps: { alarm },
        cssClass: 'alarm-notification-modal',
      });
      await modal.present();
      await modal.onDidDismiss();
      this.modalOpen = false;
    });
  }
}
