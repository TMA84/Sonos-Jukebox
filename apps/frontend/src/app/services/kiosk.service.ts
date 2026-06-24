import { Injectable, signal } from '@angular/core';
import { ClientSettings } from '@sonos-jukebox/shared';

@Injectable({ providedIn: 'root' })
export class KioskService {
  readonly isKioskMode = signal(false);

  canAccessConfig(): boolean {
    return !this.isKioskMode();
  }

  updateFromSettings(settings: ClientSettings): void {
    this.isKioskMode.set(settings.kioskMode ?? false);
  }
}
