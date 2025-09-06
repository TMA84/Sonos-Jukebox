import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.page.html',
  styleUrls: ['./config.page.scss']
})
export class ConfigPage implements OnInit {
  speakers: any[] = [];
  selectedSpeaker = '';
  isLoading = false;
  currentPin = '';
  newPin = '';
  clientId = '';

  constructor(
    private http: HttpClient,
    private clientService: ClientService
  ) {}

  ngOnInit() {
    this.clientId = this.clientService.getClientId();
    this.loadCurrentConfig();
  }

  loadCurrentConfig() {
    const configUrl = environment.production ? '../api/config' : 'http://localhost:8200/api/config';
    this.http.get<any>(configUrl, { 
      params: { clientId: this.clientId }
    }).subscribe(config => {
      this.selectedSpeaker = config.currentRoom || '';
    });
  }

  findSpeakers() {
    this.isLoading = true;
    const speakersUrl = environment.production ? '../api/speakers' : 'http://localhost:8200/api/speakers';
    
    this.http.get<any[]>(speakersUrl).subscribe({
      next: (speakers) => {
        this.speakers = speakers;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.speakers = [];
      }
    });
  }

  selectSpeaker(speaker: string) {
    this.selectedSpeaker = speaker;
    const saveUrl = environment.production ? '../api/config/speaker' : 'http://localhost:8200/api/config/speaker';
    
    this.http.post(saveUrl, { 
      speaker, 
      clientId: this.clientId 
    }).subscribe({
      next: () => {
        console.log('Speaker saved for client:', this.clientId, speaker);
      },
      error: (err) => {
        console.error('Failed to save speaker:', err);
      }
    });
  }

  changePin() {
    const pinUrl = environment.production ? '../api/config/pin' : 'http://localhost:8200/api/config/pin';
    
    this.http.post(pinUrl, { currentPin: this.currentPin, newPin: this.newPin }).subscribe({
      next: () => {
        this.currentPin = '';
        this.newPin = '';
        console.log('PIN changed successfully');
      },
      error: (err) => {
        console.error('Failed to change PIN:', err);
        this.currentPin = '';
        this.newPin = '';
      }
    });
  }
}