import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { environment } from '../environments/environment';
import { ClientService } from './client.service';
import { AlarmNotificationComponent } from './alarm-notification/alarm-notification.component';

@Injectable({
  providedIn: 'root',
})
export class AlarmNotificationService {
  private checkInterval: any;
  private lastCheckedAlarm: string | null = null;

  constructor(
    private http: HttpClient,
    private modalController: ModalController,
    private clientService: ClientService
  ) {}

  startMonitoring() {
    console.log('[AlarmNotificationService] Starting alarm monitoring...');
    // Check for active alarms every 5 seconds
    this.checkInterval = setInterval(() => {
      this.checkForActiveAlarm();
    }, 5000);

    // Check immediately
    this.checkForActiveAlarm();
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkForActiveAlarm() {
    try {
      const clientId = this.clientService.getClientId();
      console.log('[AlarmNotificationService] Checking for active alarm, clientId:', clientId);
      const response = await this.http
        .get<any>(`${environment.apiUrl}/alarms/active`, {
          params: { clientId },
        })
        .toPromise();

      console.log('[AlarmNotificationService] Active alarm response:', response);

      if (response && response.alarm) {
        // Check if this is a new alarm (not the same one we already showed)
        const alarmKey = `${response.alarm.id}-${response.alarm.triggeredAt}`;
        if (alarmKey !== this.lastCheckedAlarm) {
          console.log(
            '[AlarmNotificationService] New alarm detected, showing modal:',
            response.alarm
          );
          this.lastCheckedAlarm = alarmKey;
          await this.showAlarmModal(response.alarm);
        } else {
          console.log('[AlarmNotificationService] Alarm already shown:', alarmKey);
        }
      }
    } catch (error) {
      // No active alarm or error - ignore
      console.log('[AlarmNotificationService] No active alarm or error:', error);
    }
  }

  private async showAlarmModal(alarm: any) {
    console.log('[AlarmNotificationService] Creating modal for alarm:', alarm);
    const modal = await this.modalController.create({
      component: AlarmNotificationComponent,
      componentProps: {
        alarm,
        clientId: this.clientService.getClientId(),
      },
      backdropDismiss: false,
      cssClass: 'alarm-notification-modal',
    });

    console.log('[AlarmNotificationService] Presenting modal...');
    await modal.present();

    const { data } = await modal.onDidDismiss();
    console.log('[AlarmNotificationService] Alarm modal dismissed:', data);
  }
}
