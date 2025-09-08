import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { PinDialogComponent } from '../pin-dialog/pin-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class PinGuard implements CanActivate {

  constructor(
    private modalController: ModalController,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const modal = await this.modalController.create({
      component: PinDialogComponent,
      cssClass: 'pin-dialog-modal'
    });

    modal.present();

    const result = await modal.onDidDismiss();
    
    if (result.data !== true) {
      this.router.navigate(['/home']);
      return false;
    }
    
    return true;
  }
}