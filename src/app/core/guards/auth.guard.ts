import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { PinDialogComponent } from '../../shared/components/pin-dialog/pin-dialog.component';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const modalController = inject(ModalController);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Show PIN dialog
  const modal = await modalController.create({
    component: PinDialogComponent,
    cssClass: 'pin-dialog-modal',
  });

  await modal.present();
  const { data } = await modal.onWillDismiss();

  if (data?.authenticated) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
