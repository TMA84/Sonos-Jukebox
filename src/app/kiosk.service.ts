import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class KioskService implements OnDestroy {
  private kioskMode$ = new BehaviorSubject<boolean>(false);
  private observer: MutationObserver | null = null;

  get isKioskMode(): boolean {
    return this.kioskMode$.value;
  }

  get kioskMode() {
    return this.kioskMode$.asObservable();
  }

  setKioskMode(enabled: boolean) {
    this.kioskMode$.next(enabled);
    if (enabled) {
      this.lockAllInputs();
      this.startObserving();
    } else {
      this.unlockAllInputs();
      this.stopObserving();
    }
  }

  private lockAllInputs() {
    document.querySelectorAll('ion-searchbar').forEach(sb => {
      const input = sb.shadowRoot?.querySelector('input');
      if (input) input.setAttribute('readonly', 'true');
    });
  }

  private unlockAllInputs() {
    document.querySelectorAll('ion-searchbar').forEach(sb => {
      const input = sb.shadowRoot?.querySelector('input');
      if (input) input.removeAttribute('readonly');
    });
  }

  private startObserving() {
    this.stopObserving();
    this.observer = new MutationObserver(() => {
      if (this.isKioskMode) this.lockAllInputs();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  ngOnDestroy() {
    this.stopObserving();
  }
}
