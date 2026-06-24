import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonApp,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  musicalNotesOutline,
  alarmOutline,
  settingsOutline,
} from 'ionicons/icons';
import { KioskService } from './services/kiosk.service';
import { AlarmNotificationService } from './services/alarm-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, RouterLink],
  template: `
    <ion-app>
      <ion-router-outlet id="main-content"></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button [routerLink]="['/home']">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button [routerLink]="['/player']">
          <ion-icon name="musical-notes-outline"></ion-icon>
          <ion-label>Player</ion-label>
        </ion-tab-button>
        <ion-tab-button [routerLink]="['/alarms']">
          <ion-icon name="alarm-outline"></ion-icon>
          <ion-label>Wecker</ion-label>
        </ion-tab-button>
        @if (showConfig()) {
          <ion-tab-button [routerLink]="['/config']">
            <ion-icon name="settings-outline"></ion-icon>
            <ion-label>Admin</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-app>
  `,
})
export class AppComponent {
  private readonly kioskService = inject(KioskService);
  private readonly alarmNotificationService = inject(AlarmNotificationService);

  readonly showConfig = computed(() => this.kioskService.canAccessConfig());

  constructor() {
    addIcons({ homeOutline, musicalNotesOutline, alarmOutline, settingsOutline });
    this.alarmNotificationService.startPolling();
  }
}
