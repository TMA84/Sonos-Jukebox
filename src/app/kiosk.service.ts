import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class KioskService {
  private kioskMode$ = new BehaviorSubject<boolean>(false);

  get isKioskMode(): boolean {
    return this.kioskMode$.value;
  }

  get kioskMode() {
    return this.kioskMode$.asObservable();
  }

  setKioskMode(enabled: boolean) {
    this.kioskMode$.next(enabled);
  }
}
