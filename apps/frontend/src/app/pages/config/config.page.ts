import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  IonInput,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonNote,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonListHeader,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSearchbar,
  IonThumbnail,
  AlertController,
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  createOutline,
  saveOutline,
  searchOutline,
  checkmarkCircleOutline,
  addCircleOutline,
  pricetagOutline,
} from 'ionicons/icons';
import { ApiService } from '../../services/api.service';
import { ClientStore } from '../../stores/client.store';
import { MediaStore } from '../../stores/media.store';
import { PlayerStore } from '../../stores/player.store';
import {
  Client,
  ClientSettings,
  MediaItem,
  Schedule,
  SonosSpeaker,
  SpotifySearchResult,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyShow,
  SpotifyAudiobook,
  TuneInStation,
  MediaCategory,
  MediaSourceType,
  ContentType,
} from '@sonos-jukebox/shared';

type SearchType = 'album' | 'artist' | 'show' | 'audiobook' | 'radio';
type SearchResultItem = SpotifyAlbum | SpotifyArtist | SpotifyShow | SpotifyAudiobook | TuneInStation;

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonInput,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonNote,
    IonSpinner,
    IonButtons,
    IonBackButton,
    IonListHeader,
    IonThumbnail,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Admin</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="activeTab()" (ionChange)="activeTab.set($any($event.detail.value) ?? 'clients')">
          <ion-segment-button value="clients">
            <ion-label>Clients</ion-label>
          </ion-segment-button>
          <ion-segment-button value="media">
            <ion-label>Medien</ion-label>
          </ion-segment-button>
          <ion-segment-button value="settings">
            <ion-label>Einstellungen</ion-label>
          </ion-segment-button>
          <ion-segment-button value="schedules">
            <ion-label>Zeitpläne</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- CLIENTS TAB -->
      @if (activeTab() === 'clients') {
        <ion-list>
          <ion-list-header>
            <ion-label>Clients</ion-label>
            <ion-button slot="end" (click)="createClient()">
              <ion-icon name="add-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-list-header>
          @if (clientsLoading()) {
            <ion-item><ion-spinner></ion-spinner></ion-item>
          }
          @for (client of allClients(); track client.id) {
            <ion-item-sliding>
              <ion-item>
                <ion-label>
                  <h2>{{ client.name }}</h2>
                  <p>{{ client.id }}</p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option (click)="editClient(client)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
                <ion-item-option color="danger" (click)="deleteClient(client)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          }
        </ion-list>
      }

      <!-- MEDIA TAB -->
      @if (activeTab() === 'media') {
        <div class="ion-padding-horizontal ion-padding-top">
          <ion-select
            [value]="selectedMediaClientId()"
            (ionChange)="onMediaClientChange($event)"
            label="Client"
            labelPlacement="floating"
          >
            @for (client of allClients(); track client.id) {
              <ion-select-option [value]="client.id">{{ client.name }}</ion-select-option>
            }
          </ion-select>

          <ion-select
            style="margin-top:8px"
            [value]="mediaCategoryFilter()"
            (ionChange)="mediaCategoryFilter.set($event.detail.value)"
            label="Kategorie"
            labelPlacement="floating"
          >
            <ion-select-option value="">Alle</ion-select-option>
            <ion-select-option value="audiobook">Hörbuch</ion-select-option>
            <ion-select-option value="music">Musik</ion-select-option>
            <ion-select-option value="playlist">Playlist</ion-select-option>
            <ion-select-option value="radio">Radio</ion-select-option>
            <ion-select-option value="podcast">Podcast</ion-select-option>
            <ion-select-option value="hoerspiel">Hörspiel</ion-select-option>
          </ion-select>
        </div>

        <ion-list>
          @if (mediaLoading()) {
            <ion-item><ion-spinner></ion-spinner></ion-item>
          }
          @for (item of filteredMediaItems(); track item.id) {
            <ion-item>
              @if (item.cover) {
                <ion-thumbnail slot="start">
                  <img [src]="item.cover" [alt]="item.title" />
                </ion-thumbnail>
              }
              <ion-label>
                <h2>{{ item.title }}</h2>
                <p>{{ item.artist }} · <strong>{{ item.category }}</strong></p>
              </ion-label>
              <ion-buttons slot="end">
                <ion-button (click)="editMedia(item)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                <ion-button color="danger" (click)="deleteMedia(item)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-item>
          }
        </ion-list>

        <div class="ion-padding">
          <ion-button expand="block" (click)="openAddMediaModal()">
            <ion-icon name="add-circle-outline" slot="start"></ion-icon>
            Inhalte hinzufügen
          </ion-button>
        </div>
      }

      <!-- SETTINGS TAB -->
      @if (activeTab() === 'settings') {
        <div class="ion-padding-horizontal ion-padding-top">
          <ion-select
            [value]="selectedSettingsClientId()"
            (ionChange)="onSettingsClientChange($event)"
            label="Client"
            labelPlacement="floating"
          >
            @for (client of allClients(); track client.id) {
              <ion-select-option [value]="client.id">{{ client.name }}</ion-select-option>
            }
          </ion-select>
        </div>

        @if (settingsLoading()) {
          <div style="display:flex;justify-content:center;padding:48px"><ion-spinner></ion-spinner></div>
        } @else if (editableSettings()) {
          <ion-list>
            <ion-item>
              <ion-select
                [value]="editableSettings()!.room"
                (ionChange)="updateEditableSettings('room', $event.detail.value)"
                label="Sonos Raum"
                labelPlacement="floating"
              >
                @for (speaker of playerStore.speakers(); track speaker.uuid) {
                  <ion-select-option [value]="speaker.roomName">{{ speaker.roomName }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.enableSpeakerSelection"
                (ionChange)="updateEditableSettings('enableSpeakerSelection', $event.detail.checked)"
              >
                Lautsprecher-Auswahl
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.enableAlarmClock"
                (ionChange)="updateEditableSettings('enableAlarmClock', $event.detail.checked)"
              >
                Wecker aktivieren
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.kioskMode"
                (ionChange)="updateEditableSettings('kioskMode', $event.detail.checked)"
              >
                Kiosk-Modus
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.enableContentSearch"
                (ionChange)="updateEditableSettings('enableContentSearch', $event.detail.checked)"
              >
                Inhaltssuche
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.autoplayEnabled"
                (ionChange)="updateEditableSettings('autoplayEnabled', $event.detail.checked)"
              >
                Autoplay
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-toggle
                [checked]="editableSettings()!.repeatEnabled"
                (ionChange)="updateEditableSettings('repeatEnabled', $event.detail.checked)"
              >
                Wiederholen
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-input
                type="number"
                label="Sleep Timer (Minuten)"
                labelPlacement="floating"
                [value]="editableSettings()!.sleepTimer"
                (ionInput)="updateEditableSettings('sleepTimer', +$event.detail.value)"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-button expand="block" (click)="saveSettings()" [disabled]="settingsSaving()">
                <ion-icon name="save-outline" slot="start"></ion-icon>
                {{ settingsSaving() ? 'Speichern...' : 'Einstellungen speichern' }}
              </ion-button>
            </ion-item>
          </ion-list>
        }
      }

      <!-- SCHEDULES TAB -->
      @if (activeTab() === 'schedules') {
        <div class="ion-padding-horizontal ion-padding-top">
          <ion-select
            [value]="selectedSchedulesClientId()"
            (ionChange)="onSchedulesClientChange($event)"
            label="Client"
            labelPlacement="floating"
          >
            @for (client of allClients(); track client.id) {
              <ion-select-option [value]="client.id">{{ client.name }}</ion-select-option>
            }
          </ion-select>
        </div>

        <ion-list>
          <ion-list-header>
            <ion-label>Zeitpläne</ion-label>
            <ion-button slot="end" (click)="createSchedule()">
              <ion-icon name="add-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-list-header>

          @if (schedulesLoading()) {
            <ion-item><ion-spinner></ion-spinner></ion-item>
          }

          @for (schedule of schedules(); track schedule.id) {
            <ion-item-sliding>
              <ion-item>
                <ion-label>
                  <h2>{{ schedule.category }}</h2>
                  <p>{{ schedule.time }} — {{ formatScheduleDays(schedule) }}</p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option (click)="editSchedule(schedule)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
                <ion-item-option color="danger" (click)="deleteSchedule(schedule)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          }

          @if (schedules().length === 0 && !schedulesLoading()) {
            <ion-item>
              <ion-label style="text-align:center;color:var(--ion-color-medium)">
                Keine Zeitpläne vorhanden
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
})
export class ConfigPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly clientStore = inject(ClientStore);
  private readonly mediaStore = inject(MediaStore);
  protected readonly playerStore = inject(PlayerStore);
  private readonly alertCtrl = inject(AlertController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly modalCtrl = inject(ModalController);

  protected readonly activeTab = signal<string>('clients');

  protected readonly allClients = signal<Client[]>([]);
  protected readonly clientsLoading = signal(false);

  protected readonly selectedMediaClientId = signal<string>('');
  protected readonly mediaCategoryFilter = signal<string>('');
  protected readonly mediaItems = signal<MediaItem[]>([]);
  protected readonly mediaLoading = signal(false);

  protected readonly selectedSettingsClientId = signal<string>('');
  protected readonly editableSettings = signal<ClientSettings | null>(null);
  protected readonly settingsLoading = signal(false);
  protected readonly settingsSaving = signal(false);

  protected readonly selectedSchedulesClientId = signal<string>('');
  protected readonly schedules = signal<Schedule[]>([]);
  protected readonly schedulesLoading = signal(false);

  protected readonly filteredMediaItems = computed(() => {
    const cat = this.mediaCategoryFilter();
    const items = this.mediaItems();
    if (!cat) return items;
    return items.filter((i) => i.category === cat);
  });

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      createOutline,
      saveOutline,
      searchOutline,
      checkmarkCircleOutline,
      addCircleOutline,
      pricetagOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAllClients();
    await this.playerStore.loadSpeakers();
    const first = this.allClients()[0];
    if (first) {
      this.selectedMediaClientId.set(first.id);
      this.selectedSettingsClientId.set(first.id);
      this.selectedSchedulesClientId.set(first.id);
      await Promise.all([
        this.loadMediaForClient(first.id),
        this.loadSettingsForClient(first.id),
        this.loadSchedulesForClient(first.id),
      ]);
    }
  }

  private async loadAllClients(): Promise<void> {
    this.clientsLoading.set(true);
    try {
      const clients = await firstValueFrom(this.api.getClients());
      this.allClients.set(clients);
    } finally {
      this.clientsLoading.set(false);
    }
  }

  private async loadMediaForClient(clientId: string): Promise<void> {
    this.mediaLoading.set(true);
    try {
      const items = await firstValueFrom(this.api.getMedia(clientId));
      this.mediaItems.set(items);
    } finally {
      this.mediaLoading.set(false);
    }
  }

  private async loadSettingsForClient(clientId: string): Promise<void> {
    this.settingsLoading.set(true);
    try {
      const s = await firstValueFrom(this.api.getClientSettings(clientId));
      this.editableSettings.set({ ...s });
    } finally {
      this.settingsLoading.set(false);
    }
  }

  private async loadSchedulesForClient(clientId: string): Promise<void> {
    this.schedulesLoading.set(true);
    try {
      const s = await firstValueFrom(this.api.getSchedules(clientId));
      this.schedules.set(s);
    } finally {
      this.schedulesLoading.set(false);
    }
  }

  async onMediaClientChange(event: CustomEvent): Promise<void> {
    const id = event.detail.value as string;
    this.selectedMediaClientId.set(id);
    await this.loadMediaForClient(id);
  }

  async onSettingsClientChange(event: CustomEvent): Promise<void> {
    const id = event.detail.value as string;
    this.selectedSettingsClientId.set(id);
    await this.loadSettingsForClient(id);
  }

  async onSchedulesClientChange(event: CustomEvent): Promise<void> {
    const id = event.detail.value as string;
    this.selectedSchedulesClientId.set(id);
    await this.loadSchedulesForClient(id);
  }

  updateEditableSettings(key: keyof ClientSettings, value: unknown): void {
    const current = this.editableSettings();
    if (!current) return;
    this.editableSettings.set({ ...current, [key]: value });
  }

  async saveSettings(): Promise<void> {
    const s = this.editableSettings();
    if (!s) return;
    this.settingsSaving.set(true);
    try {
      await this.clientStore.updateSettings(s);
    } finally {
      this.settingsSaving.set(false);
    }
  }

  async createClient(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Client erstellen',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Name' }],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Erstellen',
          handler: async (data) => {
            const created = await firstValueFrom(this.api.createClient({ name: data.name }));
            this.allClients.update((c) => [...c, created]);
          },
        },
      ],
    });
    await alert.present();
  }

  async editClient(client: Client): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Client bearbeiten',
      inputs: [{ name: 'name', type: 'text', value: client.name }],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Speichern',
          handler: async (data) => {
            const updated = await firstValueFrom(
              this.api.updateClient(client.id, { name: data.name }),
            );
            this.allClients.update((c) => c.map((x) => (x.id === client.id ? updated : x)));
            await this.clientStore.loadClients();
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteClient(client: Client): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Client löschen',
      message: `"${client.name}" wirklich löschen?`,
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.api.deleteClient(client.id));
            this.allClients.update((c) => c.filter((x) => x.id !== client.id));
            await this.clientStore.loadClients();
          },
        },
      ],
    });
    await alert.present();
  }

  async editMedia(item: MediaItem): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: item.title,
      buttons: [
        {
          text: 'Titel / Künstler bearbeiten',
          icon: 'create-outline',
          handler: () => { void this.editMediaTitleArtist(item); },
        },
        {
          text: 'Kategorie ändern',
          icon: 'pricetag-outline',
          handler: () => { void this.editMediaCategory(item); },
        },
        { text: 'Abbrechen', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async editMediaTitleArtist(item: MediaItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Titel / Künstler',
      inputs: [
        { name: 'title', type: 'text', value: item.title, placeholder: 'Titel' },
        { name: 'artist', type: 'text', value: item.artist ?? '', placeholder: 'Künstler' },
      ],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Speichern',
          handler: async (data: { title: string; artist: string }) => {
            const updated = await firstValueFrom(
              this.api.updateMedia(item.id, item.clientId, {
                title: data.title?.trim() || item.title,
                artist: data.artist?.trim() || item.artist,
              }),
            );
            this.mediaItems.update((m) => m.map((x) => (x.id === item.id ? updated : x)));
          },
        },
      ],
    });
    await alert.present();
  }

  private async editMediaCategory(item: MediaItem): Promise<void> {
    const categoryLabels: Record<MediaCategory, string> = {
      [MediaCategory.Music]: 'Musik',
      [MediaCategory.Audiobook]: 'Hörbuch',
      [MediaCategory.Playlist]: 'Playlist',
      [MediaCategory.Radio]: 'Radio',
      [MediaCategory.Podcast]: 'Podcast',
      [MediaCategory.Hoerspiel]: 'Hörspiel',
    };
    const alert = await this.alertCtrl.create({
      header: 'Kategorie wählen',
      inputs: Object.values(MediaCategory).map((cat) => ({
        type: 'radio' as const,
        label: categoryLabels[cat],
        value: cat,
        checked: item.category === cat,
      })),
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Speichern',
          handler: async (selectedCategory: MediaCategory) => {
            if (!selectedCategory) return;
            const updated = await firstValueFrom(
              this.api.updateMedia(item.id, item.clientId, { category: selectedCategory }),
            );
            this.mediaItems.update((m) => m.map((x) => (x.id === item.id ? updated : x)));
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteMedia(item: MediaItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Medium löschen',
      message: `"${item.title}" wirklich löschen?`,
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.api.deleteMedia(item.id, item.clientId));
            this.mediaItems.update((m) => m.filter((x) => x.id !== item.id));
          },
        },
      ],
    });
    await alert.present();
  }

  async openAddMediaModal(): Promise<void> {
    const clientId = this.selectedMediaClientId();
    if (!clientId) return;
    const existingIds = this.mediaItems().flatMap(m => [m.id, m.spotifyId].filter(Boolean) as string[]);
    const { AddMediaModalComponent } = await import('./add-media-modal.component');
    const modal = await this.modalCtrl.create({
      component: AddMediaModalComponent,
      componentProps: { clientId, existingIds },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ addedCount: number }>();
    if (data?.addedCount) {
      await this.loadMediaForClient(clientId);
    }
  }

  formatScheduleDays(schedule: Schedule): string {
    if (!schedule.days?.length) return 'Keine Tage';
    if (schedule.days.length === 7) return 'Täglich';
    return schedule.days.map(d => DAY_LABELS[d] ?? '').join(', ');
  }

  async createSchedule(): Promise<void> {
    const clientId = this.selectedSchedulesClientId();
    if (!clientId) return;
    const alert = await this.alertCtrl.create({
      header: 'Zeitplan erstellen',
      inputs: [
        { name: 'category', type: 'text', placeholder: 'Kategorie (z.B. music)' },
        { name: 'startTime', type: 'time', value: '08:00', label: 'Von' },
        { name: 'endTime', type: 'time', value: '22:00', label: 'Bis' },
      ],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Erstellen',
          handler: async (data: { category: string; startTime: string; endTime: string }) => {
            if (!data.category?.trim() || !data.startTime || !data.endTime) return false;
            const created = await firstValueFrom(this.api.createSchedule({
              clientId,
              category: data.category.trim() as MediaCategory,
              startTime: data.startTime,
              endTime: data.endTime,
              days: [0, 1, 2, 3, 4, 5, 6],
              enabled: true,
            }));
            this.schedules.update((s) => [...s, created]);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editSchedule(schedule: Schedule): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Zeitplan bearbeiten',
      inputs: [
        { name: 'category', type: 'text', value: schedule.category },
        { name: 'startTime', type: 'time', value: schedule.startTime, label: 'Von' },
        { name: 'endTime', type: 'time', value: schedule.endTime, label: 'Bis' },
      ],
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Speichern',
          handler: async (data: { category: string; startTime: string; endTime: string }) => {
            const updated = await firstValueFrom(this.api.updateSchedule(schedule.id, {
              category: data.category?.trim() as MediaCategory || schedule.category,
              startTime: data.startTime || schedule.startTime,
              endTime: data.endTime || schedule.endTime,
            }));
            this.schedules.update((s) => s.map((x) => (x.id === schedule.id ? updated : x)));
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteSchedule(schedule: Schedule): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Zeitplan löschen',
      message: `Zeitplan "${schedule.category} (${schedule.startTime}-${schedule.endTime})" wirklich löschen?`,
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.api.deleteSchedule(schedule.id));
            this.schedules.update((s) => s.filter((x) => x.id !== schedule.id));
          },
        },
      ],
    });
    await alert.present();
  }
}

export default ConfigPage;
