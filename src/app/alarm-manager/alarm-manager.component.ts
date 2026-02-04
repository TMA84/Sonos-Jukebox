import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AlarmService, Alarm } from '../alarm.service';
import { AlarmEditComponent } from '../alarm-edit/alarm-edit.component';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-alarm-manager',
  templateUrl: './alarm-manager.component.html',
  styleUrls: ['./alarm-manager.component.css'],
})
export class AlarmManagerComponent implements OnInit {
  alarms: Alarm[] = [];
  clientId: string = '';
  libraryItems: any[] = [];

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private alarmService: AlarmService,
    private http: HttpClient,
    private clientService: ClientService
  ) {}

  ngOnInit() {
    this.clientId = this.clientService.getClientId();
    console.log('AlarmManagerComponent - Client ID:', this.clientId);
    this.loadAlarms();
    this.loadLibraryItems();
  }

  loadAlarms() {
    this.alarmService.getAlarms(this.clientId).subscribe({
      next: alarms => {
        this.alarms = alarms;
      },
      error: err => {
        console.error('Failed to load alarms:', err);
        this.alarms = [];
      },
    });
  }

  loadLibraryItems() {
    const dataUrl = `${environment.apiUrl}/data`;
    console.log('Loading library items for client:', this.clientId);
    this.http
      .get<any[]>(dataUrl, {
        params: { clientId: this.clientId },
      })
      .subscribe({
        next: items => {
          this.libraryItems = items;
          console.log('Library items loaded:', items.length, items);
        },
        error: err => {
          console.error('Failed to load library items:', err);
          this.libraryItems = [];
        },
      });
  }

  loadLibraryItemsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dataUrl = `${environment.apiUrl}/data`;
      console.log('Loading library items for client (async):', this.clientId);
      this.http
        .get<any[]>(dataUrl, {
          params: { clientId: this.clientId },
        })
        .subscribe({
          next: items => {
            this.libraryItems = items;
            console.log('Library items loaded (async):', items.length, items);
            resolve();
          },
          error: err => {
            console.error('Failed to load library items:', err);
            this.libraryItems = [];
            resolve(); // Resolve anyway to not block the modal
          },
        });
    });
  }

  async createNewAlarm() {
    // Ensure library items are loaded
    console.log('Current library items count:', this.libraryItems.length);
    if (this.libraryItems.length === 0) {
      console.log('Library items not loaded yet, loading now...');
      await this.loadLibraryItemsAsync();
      // Small delay to ensure data is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Creating alarm with library items:', this.libraryItems.length, this.libraryItems);

    const modal = await this.modalController.create({
      component: AlarmEditComponent,
      componentProps: {
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
      },
      cssClass: 'alarm-edit-modal',
    });

    modal.onDidDismiss().then(result => {
      if (result.data) {
        this.alarmService.createAlarm(result.data).subscribe({
          next: async () => {
            this.loadAlarms();
            const toast = await this.toastController.create({
              message: 'Alarm created successfully',
              duration: 2000,
              color: 'success',
            });
            toast.present();
          },
          error: async err => {
            console.error('Failed to create alarm:', err);
            const toast = await this.toastController.create({
              message: 'Failed to create alarm',
              duration: 2000,
              color: 'danger',
            });
            toast.present();
          },
        });
      }
    });

    return await modal.present();
  }

  async editAlarm(alarm: Alarm) {
    // Ensure library items are loaded
    if (this.libraryItems.length === 0) {
      console.log('Library items not loaded yet, loading now...');
      await this.loadLibraryItemsAsync();
    }

    console.log('Editing alarm with library items:', this.libraryItems.length);

    const modal = await this.modalController.create({
      component: AlarmEditComponent,
      componentProps: {
        alarm: { ...alarm },
        libraryItems: this.libraryItems,
      },
      cssClass: 'alarm-edit-modal',
    });

    modal.onDidDismiss().then(result => {
      if (result.data) {
        this.alarmService.updateAlarm(result.data).subscribe({
          next: async () => {
            this.loadAlarms();
            const toast = await this.toastController.create({
              message: 'Alarm updated successfully',
              duration: 2000,
              color: 'success',
            });
            toast.present();
          },
          error: async err => {
            console.error('Failed to update alarm:', err);
            const toast = await this.toastController.create({
              message: 'Failed to update alarm',
              duration: 2000,
              color: 'danger',
            });
            toast.present();
          },
        });
      }
    });

    return await modal.present();
  }

  async deleteAlarm(alarm: Alarm) {
    if (!alarm.id) return;

    this.alarmService.deleteAlarm(alarm.id).subscribe({
      next: async () => {
        this.loadAlarms();
        const toast = await this.toastController.create({
          message: 'Alarm deleted successfully',
          duration: 2000,
          color: 'success',
        });
        toast.present();
      },
      error: async err => {
        console.error('Failed to delete alarm:', err);
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
      next: () => {
        console.log('Alarm toggled:', alarm.enabled);
      },
      error: err => {
        console.error('Failed to toggle alarm:', err);
        alarm.enabled = !alarm.enabled; // Revert on error
      },
    });
  }

  async testAlarm(alarm: Alarm) {
    if (!alarm.id) return;

    console.log('Testing alarm:', alarm.name);
    this.http.post(`${environment.apiUrl}/alarms/${alarm.id}/test`, {}).subscribe({
      next: async (response: any) => {
        console.log('Alarm test response:', response);
        const toast = await this.toastController.create({
          message: `Testing alarm: ${alarm.name}`,
          duration: 2000,
          color: 'success',
        });
        toast.present();
      },
      error: async err => {
        console.error('Failed to test alarm:', err);
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
    if (alarm.days.length === 0) {
      return 'One time';
    }
    if (alarm.days.length === 7) {
      return 'Every day';
    }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return alarm.days.map(d => dayNames[d]).join(', ');
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
