import { Component } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Configuration</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Configuration Modal</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>This is a basic configuration modal. The full implementation will be added step by step.</p>
          <ion-button expand="block" (click)="dismiss()">Close</ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [`
    ion-card {
      margin: 16px 0;
    }
  `]
})
export class ConfigModalComponent {
  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }
}
