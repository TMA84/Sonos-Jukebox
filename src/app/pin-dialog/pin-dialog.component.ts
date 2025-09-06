import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  styleUrls: ['./pin-dialog.component.scss']
})
export class PinDialogComponent implements OnInit {
  pin = '';
  correctPin = '1234';

  constructor(
    private modalController: ModalController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const pinUrl = environment.production ? '../api/pin' : 'http://localhost:8200/api/pin';
    this.http.get(pinUrl, { responseType: 'text' }).subscribe(pin => {
      this.correctPin = pin;
    });
  }

  addDigit(digit: string) {
    if (this.pin.length < 4) {
      this.pin += digit;
      if (this.pin.length === 4) {
        this.checkPin();
      }
    }
  }

  clearPin() {
    this.pin = '';
  }

  checkPin() {
    if (this.pin === this.correctPin) {
      this.modalController.dismiss(true);
    } else {
      this.pin = '';
    }
  }

  closeModal() {
    this.modalController.dismiss(false);
  }
}