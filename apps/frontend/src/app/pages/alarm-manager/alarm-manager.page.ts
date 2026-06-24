import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonToggle,
  IonNote,
  IonButtons,
  IonSpinner,
  IonListHeader,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api.service';
import { ClientStore } from '../../stores/client.store';
import { Alarm } from '@sonos-jukebox/shared';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatDaysFromArray(days: number[]): string {
  if (days.length === 0) return 'Einmalig';
  if (days.length === 7) return 'Täglich';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}

function parseDaysFromCheckboxData(data: Record<string, unknown>): number[] {
  return DAY_LABELS.map((_, i) => i).filter((i) => {
    const val = data[`day_${i}`];
    return Array.isArray(val) ? val.includes(`${i}`) : !!val;
  });
}

@Component({
  selector: 'app-alarm-manager',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonToggle,
    IonNote,
    IonButtons,
    IonSpinner,
    IonListHeader,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Wecker</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <ion-spinner></ion-spinner>
        </div>
      } @else {
        <ion-list>
          <ion-list-header>
            <ion-label>
              @if (nextAlarm()) {
                Nächster Wecker: {{ nextAlarm()!.name }} um {{ nextAlarm()!.time }}
              } @else {
                Keine aktiven Wecker
              }
            </ion-label>
            <ion-button slot="end" (click)="createAlarm()">
              <ion-icon name="add-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-list-header>

          @for (alarm of alarms(); track alarm.id) {
            <ion-item>
              <ion-label>
                <h2>{{ alarm.name }}</h2>
                <p>{{ alarm.time }} — {{ formatDays(alarm) }}</p>
                <ion-note>Lautstärke: {{ alarm.volume }}</ion-note>
              </ion-label>
              <ion-toggle
                slot="end"
                [checked]="alarm.enabled"
                (ionChange)="toggleAlarm(alarm, $event)"
              ></ion-toggle>
              <ion-buttons slot="end">
                <ion-button (click)="editAlarm(alarm)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                <ion-button color="danger" (click)="deleteAlarm(alarm)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-item>
          }

          @if (alarms().length === 0) {
            <ion-item>
              <ion-label style="text-align:center;color:var(--ion-color-medium)">
                Keine Wecker vorhanden
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
})
export class AlarmManagerPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly clientStore = inject(ClientStore);
  private readonly alertCtrl = inject(AlertController);

  protected readonly alarms = signal<Alarm[]>([]);
  protected readonly loading = signal(false);

  protected readonly nextAlarm = computed(() => {
    const enabled = this.alarms().filter((a) => a.enabled);
    if (enabled.length === 0) return null;
    return enabled.sort((a, b) => a.time.localeCompare(b.time))[0];
  });

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAlarms();
  }

  async loadAlarms(): Promise<void> {
    const client = this.clientStore.currentClient();
    if (!client) return;
    this.loading.set(true);
    try {
      const alarms = await firstValueFrom(this.api.getAlarms(client.id));
      this.alarms.set(alarms);
    } finally {
      this.loading.set(false);
    }
  }

  formatDays(alarm: Alarm): string {
    return formatDaysFromArray(alarm.days ?? []);
  }

  async createAlarm(): Promise<void> {
    const client = this.clientStore.currentClient();
    if (!client) return;

    const alert = await this.alertCtrl.create({
      header: 'Wecker erstellen',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Name' },
        { name: 'time', type: 'time', value: '07:00' },
        { name: 'volume', type: 'number', placeholder: 'Lautstärke (0-100)', value: '50' },
        ...DAY_LABELS.map((label, i) => ({
          name: `day_${i}`,
          type: 'checkbox' as const,
          label,
          value: `${i}`,
          checked: i < 5,
        })),
      ],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Erstellen',
          handler: async (data) => {
            const dto: Partial<Alarm> = {
              clientId: client.id,
              name: data['name'] || 'Wecker',
              time: data['time'],
              volume: Number(data['volume']),
              enabled: true,
              days: parseDaysFromCheckboxData(data as Record<string, unknown>),
            };
            const created = await firstValueFrom(this.api.createAlarm(dto));
            this.alarms.update((a) => [...a, created]);
          },
        },
      ],
    });
    await alert.present();
  }

  async editAlarm(alarm: Alarm): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Wecker bearbeiten',
      inputs: [
        { name: 'name', type: 'text', value: alarm.name },
        { name: 'time', type: 'time', value: alarm.time },
        { name: 'volume', type: 'number', value: String(alarm.volume) },
        ...DAY_LABELS.map((label, i) => ({
          name: `day_${i}`,
          type: 'checkbox' as const,
          label,
          value: `${i}`,
          checked: alarm.days?.includes(i) ?? false,
        })),
      ],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Speichern',
          handler: async (data) => {
            const dto: Partial<Alarm> = {
              name: data['name'],
              time: data['time'],
              volume: Number(data['volume']),
              days: parseDaysFromCheckboxData(data as Record<string, unknown>),
            };
            const updated = await firstValueFrom(this.api.updateAlarm(alarm.id, dto));
            this.alarms.update((a) => a.map((x) => (x.id === alarm.id ? updated : x)));
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteAlarm(alarm: Alarm): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Wecker löschen',
      message: `"${alarm.name}" wirklich löschen?`,
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.api.deleteAlarm(alarm.id));
            this.alarms.update((a) => a.filter((x) => x.id !== alarm.id));
          },
        },
      ],
    });
    await alert.present();
  }

  async toggleAlarm(alarm: Alarm, event: CustomEvent): Promise<void> {
    const enabled = event.detail.checked as boolean;
    const updated = await firstValueFrom(this.api.updateAlarm(alarm.id, { enabled }));
    this.alarms.update((a) => a.map((x) => (x.id === alarm.id ? updated : x)));
  }
}

export default AlarmManagerPage;
