import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  styleUrls: ['./pin-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PinDialogComponent implements OnInit {
  pin = '';

  constructor(private modalController: ModalController, private http: HttpClient) {}

  ngOnInit() {
    // No need to fetch PIN - we'll verify on server
  }

  addDigit(digit: string) {
    if (this.pin.length < 12) {
      this.pin += digit;
    }
  }

  checkPinManually() {
    if (this.pin.length >= 1) {
      this.checkPin();
    }
  }

  getPinDisplay(): string {
    return '●'.repeat(this.pin.length);
  }

  clearPin() {
    this.pin = '';
  }

  checkPin() {
    const pinUrl = environment.production
      ? '../api/pin/verify'
      : 'http://localhost:8200/api/pin/verify';

    this.http.post<{ valid: boolean }>(pinUrl, { pin: this.pin }).subscribe({
      next: response => {
        if (response.valid) {
          this.modalController.dismiss({ authenticated: true });
        } else {
          this.pin = '';
        }
      },
      error: () => {
        this.pin = '';
      },
    });
  }

  closeModal() {
    this.modalController.dismiss({ authenticated: false });
  }
}
