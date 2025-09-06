import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  clientName = '';
  availableClients: any[] = [];
  spotifyConfig = { clientId: '', clientSecret: '' };
  sonosConfig = { server: '', port: '' };
  selectedTab = 'speakers';

  constructor(
    private http: HttpClient,
    private clientService: ClientService,
    private router: Router
  ) {}

  ngOnInit() {
    this.clientId = this.clientService.getClientId();
    this.loadCurrentConfig();
    this.loadFullConfig();
    this.loadClientName();
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

  getSpeakerName(speaker: any): string {
    return speaker.roomName || speaker.coordinator?.roomName || speaker.coordinator?.playerName || 'Unknown Speaker';
  }

  getSpeakerDetails(speaker: any): string {
    const playerName = speaker.coordinator?.playerName || 'Unknown Player';
    const currentTrack = speaker.coordinator?.state?.currentTrack;
    const trackInfo = currentTrack?.artist ? `${currentTrack.artist} - ${currentTrack.title}` : 'No track playing';
    return `${playerName} - ${trackInfo}`;
  }

  loadFullConfig() {
    const configUrl = environment.production ? '../api/config/full' : 'http://localhost:8200/api/config/full';
    this.http.get<any>(configUrl).subscribe(config => {
      this.spotifyConfig = {
        clientId: config.spotify?.clientId || '',
        clientSecret: config.spotify?.clientSecret || ''
      };
      this.sonosConfig = {
        server: config['node-sonos-http-api']?.server || '',
        port: config['node-sonos-http-api']?.port || ''
      };
    });
  }

  saveSpotifyConfig() {
    const saveUrl = environment.production ? '../api/config/spotify' : 'http://localhost:8200/api/config/spotify';
    this.http.post(saveUrl, this.spotifyConfig).subscribe({
      next: () => console.log('Spotify configuration saved'),
      error: (err) => console.error('Failed to save Spotify config:', err)
    });
  }

  saveSonosConfig() {
    const saveUrl = environment.production ? '../api/config/sonos' : 'http://localhost:8200/api/config/sonos';
    this.http.post(saveUrl, this.sonosConfig).subscribe({
      next: () => console.log('Sonos configuration saved'),
      error: (err) => console.error('Failed to save Sonos config:', err)
    });
  }

  openAddPage(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigate(['/add']);
  }

  openEditPage(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigate(['/edit']);
  }

  tabChanged(event: any) {
    this.selectedTab = event.detail.value;
  }

  loadClientName() {
    const configUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.get<any>(configUrl, { 
      params: { clientId: this.clientId }
    }).subscribe(config => {
      this.clientName = config.name || '';
    });
  }

  saveClientName() {
    const saveUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.post(saveUrl, { 
      clientId: this.clientId,
      name: this.clientName 
    }).subscribe({
      next: () => console.log('Client name saved'),
      error: (err) => console.error('Failed to save client name:', err)
    });
  }

  loadClients() {
    const clientsUrl = environment.production ? '../api/clients' : 'http://localhost:8200/api/clients';
    this.http.get<any[]>(clientsUrl).subscribe(clients => {
      this.availableClients = clients;
    });
  }

  switchToClient(clientId: string) {
    this.clientService.setClientId(clientId);
    window.location.reload();
  }
}