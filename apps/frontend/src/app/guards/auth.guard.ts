import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = async () => {
  const api = inject(ApiService);
  const router = inject(Router);
  const modalCtrl = inject(ModalController);

  const token = localStorage.getItem('auth_token');
  if (token) {
    const result = await firstValueFrom(api.verifyToken());
    if (result.valid) return true;
    localStorage.removeItem('auth_token');
  }

  const { PinDialogPage } = await import('../pages/pin-dialog/pin-dialog.page');
  const modal = await modalCtrl.create({ component: PinDialogPage, cssClass: 'pin-dialog-modal' });
  await modal.present();
  const { data } = await modal.onWillDismiss<{ token: string }>();
  if (data?.token) {
    localStorage.setItem('auth_token', data.token);
    return true;
  }
  router.navigate(['/home']);
  return false;
};
