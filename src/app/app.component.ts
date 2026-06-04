import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AlarmNotificationService } from './alarm-notification.service';
import { KioskService } from './kiosk.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private router: Router,
    private alarmNotificationService: AlarmNotificationService,
    private kioskService: KioskService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Always start on home page (important after server restart)
      this.router.navigateByUrl('/home');

      // Start monitoring for active alarms
      this.alarmNotificationService.startMonitoring();

      // Watch for kiosk mode changes and apply body class
      this.kioskService.kioskMode.subscribe(enabled => {
        if (enabled) {
          document.body.classList.add('kiosk-mode');
        } else {
          document.body.classList.remove('kiosk-mode');
        }
      });
    });
  }
}
