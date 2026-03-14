import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AlarmService, Alarm } from '../alarm.service';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-alarm-manager',
  templateUrl: './alarm-manager.component.html',
  styleUrls: ['./alarm-manager.component.css'],
})
export class AlarmManagerComponent implements OnInit {
  alarms: Alarm[] = [];
  clientId = '';
  libraryItems: any[] = [];
  nextAlarmText = '';

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private alarmService: AlarmService,
    private http: HttpClient,
    private clientService: ClientService
  ) {}

  ngOnInit() {
    this.clientId = this.clientService.getClientId();
    this.loadAlarms();
    this.loadLibraryItems();
  }

  loadAlarms() {
    this.alarmService.getAlarms(this.clientId).subscribe({
      next: alarms => {
        this.alarms = alarms;
        this.computeNextAlarm();
      },
      error: () => {
        this.alarms = [];
        this.nextAlarmText = '';
      },
    });
  }

  computeNextAlarm() {
    const enabled = this.alarms.filter(a => a.enabled && a.time);
    if (enabled.length === 0) {
      this.nextAlarmText = '';
      return;
    }

    const now = new Date();
    const nowDay = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let closest = Infinity;
    let closestLabel = '';

    for (const alarm of enabled) {
      const [h, m] = alarm.time.split(':').map(Number);
      const alarmMinutes = h * 60 + m;
      const days = alarm.days.length > 0 ? alarm.days : [nowDay];

      for (const day of days) {
        let diff = (day - nowDay) * 1440 + (alarmMinutes - nowMinutes);
        if (diff <= 0) diff += 7 * 1440;
        if (diff < closest) {
          closest = diff;
          closestLabel = alarm.time;
        }
      }
    }

    if (closest < Infinity) {
      const hours = Math.floor(closest / 60);
      const mins = closest % 60;
      if (hours < 1) {
        this.nextAlarmText = `Next: ${closestLabel} (in ${mins}min)`;
      } else if (hours < 24) {
        this.nextAlarmText = `Next: ${closestLabel} (in ${hours}h ${mins}min)`;
      } else {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const targetDay = new Date(now.getTime() + closest * 60000);
        this.nextAlarmText = `Next: ${dayNames[targetDay.getDay()]} ${closestLabel}`;
      }
    }
  }

  loadLibraryItems() {
    const dataUrl = `${environment.apiUrl}/data`;
    this.http.get<any[]>(dataUrl, { params: { clientId: this.clientId } }).subscribe({
      next: items => {
        this.libraryItems = items;
      },
      error: () => {
        this.libraryItems = [];
      },
    });
  }

  loadLibraryItemsAsync(): Promise<void> {
    return new Promise(resolve => {
      const dataUrl = `${environment.apiUrl}/data`;
      this.http.get<any[]>(dataUrl, { params: { clientId: this.clientId } }).subscribe({
        next: items => {
          this.libraryItems = items;
          resolve();
        },
        error: () => {
          this.libraryItems = [];
          resolve();
        },
      });
    });
  }

  async createNewAlarm() {
    if (this.libraryItems.length === 0) {
      await this.loadLibraryItemsAsync();
    }
    this.modalController.dismiss(
      {
        alarm: {
          clientId: this.clientId,
          name: '',
          time: '07:00',
          enabled: true,
          days: [],
          volume: 30,
          fadeIn: true,
          fadeDuration: 30,
        },
        libraryItems: this.libraryItems,
        isNew: true,
      },
      'open-edit'
    );
  }

  async editAlarm(alarm: Alarm) {
    if (this.libraryItems.length === 0) {
      await this.loadLibraryItemsAsync();
    }
    this.modalController.dismiss(
      {
        alarm: { ...alarm },
        libraryItems: this.libraryItems,
        isNew: false,
      },
      'open-edit'
    );
  }

  async confirmDelete(alarm: Alarm) {
    const alert = await this.alertController.create({
      header: 'Delete Alarm',
      message: `Delete "${alarm.name}"?`,
      cssClass: 'dark-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteAlarm(alarm),
        },
      ],
    });
    await alert.present();
  }

  deleteAlarm(alarm: Alarm) {
    if (!alarm.id) return;
    this.alarmService.deleteAlarm(alarm.id).subscribe({
      next: async () => {
        this.loadAlarms();
        const toast = await this.toastController.create({
          message: 'Alarm deleted',
          duration: 2000,
          color: 'success',
        });
        toast.present();
      },
      error: async () => {
        const toast = await this.toastController.create({
          message: 'Failed to delete alarm',
          duration: 2000,
          color: 'danger',
        });
        toast.present();
      },
    });
  }

  toggleAlarmEnabled(alarm: Alarm) {
    if (!alarm.id) return;
    this.alarmService.toggleAlarm(alarm.id, alarm.enabled).subscribe({
      next: () => this.computeNextAlarm(),
      error: () => {
        alarm.enabled = !alarm.enabled;
      },
    });
  }

  async testAlarm(alarm: Alarm) {
    if (!alarm.id) return;
    this.http.post(`${environment.apiUrl}/alarms/${alarm.id}/test`, {}).subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: `Testing: ${alarm.name}`,
          duration: 2000,
          color: 'success',
        });
        toast.present();
      },
      error: async () => {
        const toast = await this.toastController.create({
          message: 'Failed to test alarm',
          duration: 2000,
          color: 'danger',
        });
        toast.present();
      },
    });
  }

  getAlarmDaysText(alarm: Alarm): string {
    if (alarm.days.length === 0) return 'One time';
    if (alarm.days.length === 7) return 'Every day';
    if (alarm.days.length === 5 && alarm.days.every((d: number) => d >= 1 && d <= 5))
      return 'Weekdays';
    if (alarm.days.length === 2 && alarm.days.includes(0) && alarm.days.includes(6))
      return 'Weekend';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return alarm.days.map((d: number) => dayNames[d]).join(', ');
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
