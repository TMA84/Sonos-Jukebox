import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-alarm-notification',
  templateUrl: './alarm-notification.component.html',
  styleUrls: ['./alarm-notification.component.css'],
})
export class AlarmNotificationComponent {
  @Input() alarm: any;
  @Input() clientId: string;

  constructor(
    private modalController: ModalController,
    private http: HttpClient
  ) {}

  stopAlarm() {
    // Stop playback
    this.http
      .post(`${environment.apiUrl}/alarms/stop`, {
        clientId: this.clientId,
      })
      .subscribe({
        next: () => {
          console.log('Alarm stopped');
          this.modalController.dismiss({ action: 'stop' });
        },
        error: err => {
          console.error('Failed to stop alarm:', err);
          this.modalController.dismiss({ action: 'stop' });
        },
      });
  }

  snooze(minutes: number) {
    // Snooze alarm
    this.http
      .post(`${environment.apiUrl}/alarms/${this.alarm.id}/snooze`, {
        minutes,
      })
      .subscribe({
        next: () => {
          console.log(`Alarm snoozed for ${minutes} minutes`);
          this.modalController.dismiss({ action: 'snooze', minutes });
        },
        error: err => {
          console.error('Failed to snooze alarm:', err);
          this.modalController.dismiss({ action: 'snooze', minutes });
        },
      });
  }
}
