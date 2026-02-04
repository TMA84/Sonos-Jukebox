import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AlarmNotificationService } from './alarm-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private alarmNotificationService: AlarmNotificationService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Modern Ionic handles status bar and splash screen automatically

      // Start monitoring for active alarms
      this.alarmNotificationService.startMonitoring();
    });
  }
}
