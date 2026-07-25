import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { MediaService } from '../media.service';
import { Media } from '../media';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
})
export class EditPage implements OnInit, OnDestroy {

  media: Media[] = [];
  showKeyboard = false;
  private mediaSub: Subscription;
  isUpperCase = false;
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  constructor(
    private mediaService: MediaService,
    public alertController: AlertController,
    private router: Router
  ) { }

  ngOnInit() {
    this.mediaSub = this.mediaService.getRawMediaObservable().subscribe(media => {
      this.media = media;
    });
    this.mediaService.updateRawMedia();
  }

  ngOnDestroy() {
    this.mediaSub?.unsubscribe();
  }

  async deleteButtonPressed(index: number) {
    const alert = await this.alertController.create({
      cssClass: 'alert',
      header: 'Warning',
      message: 'Do you want to delete the selected item from your library?',
      buttons: [
        {
          text: 'Ok',
          handler: () => {
            this.mediaService.deleteRawMediaAtIndex(index);
            this.reloadHome();
          }
        },
        {
          text: 'Cancel'
        }
      ]
    });

    await alert.present();
  }

  addButtonPressed() {
    this.router.navigate(['/add']);
  }

  reloadHome() {
    // Trigger home page reload by updating media service
    this.mediaService.updateRawMedia();
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  addKey(key: string) {
    // Edit page doesn't have input fields, keyboard is for future use
  }

  backspace() {
    // Edit page doesn't have input fields, keyboard is for future use
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }
}
