import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { KioskService } from '../services/kiosk.service';

export const kioskGuard: CanActivateFn = () => {
  const kioskService = inject(KioskService);
  return !kioskService.isKioskMode();
};
