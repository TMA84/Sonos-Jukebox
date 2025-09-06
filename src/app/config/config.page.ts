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
  confirmPin = '';
  clientId = '';
  clientName = '';
  newClientName = '';
  availableClients: any[] = [];
  spotifyConfig = { clientId: '', clientSecret: '' };
  sonosConfig = { server: '', port: '' };
  selectedTab = 'speakers';
  showKeyboard = false;
  isUpperCase = false;
  activeInput = '';
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

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
        this.confirmPin = '';
        console.log('PIN changed successfully');
      },
      error: (err) => {
        console.error('Failed to change PIN:', err);
        this.currentPin = '';
        this.newPin = '';
        this.confirmPin = '';
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
    this.clientId = clientId;
    this.loadCurrentConfig();
    this.loadClientName();
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  setActiveInput(inputName: string) {
    this.activeInput = inputName;
  }

  addKey(key: string) {
    const keyToAdd = this.isUpperCase ? key.toUpperCase() : key;
    switch (this.activeInput) {
      case 'currentPin':
        this.currentPin += keyToAdd;
        break;
      case 'newPin':
        this.newPin += keyToAdd;
        break;
      case 'confirmPin':
        this.confirmPin += keyToAdd;
        break;
      case 'clientName':
        this.clientName += keyToAdd;
        break;
      case 'spotifyClientId':
        this.spotifyConfig.clientId += keyToAdd;
        break;
      case 'spotifyClientSecret':
        this.spotifyConfig.clientSecret += keyToAdd;
        break;
      case 'sonosServer':
        this.sonosConfig.server += keyToAdd;
        break;
      case 'sonosPort':
        this.sonosConfig.port += keyToAdd;
        break;
      case 'newClientName':
        this.newClientName += keyToAdd;
        break;
    }
  }

  backspace() {
    switch (this.activeInput) {
      case 'currentPin':
        this.currentPin = this.currentPin.slice(0, -1);
        break;
      case 'newPin':
        this.newPin = this.newPin.slice(0, -1);
        break;
      case 'confirmPin':
        this.confirmPin = this.confirmPin.slice(0, -1);
        break;
      case 'clientName':
        this.clientName = this.clientName.slice(0, -1);
        break;
      case 'spotifyClientId':
        this.spotifyConfig.clientId = this.spotifyConfig.clientId.slice(0, -1);
        break;
      case 'spotifyClientSecret':
        this.spotifyConfig.clientSecret = this.spotifyConfig.clientSecret.slice(0, -1);
        break;
      case 'sonosServer':
        this.sonosConfig.server = this.sonosConfig.server.slice(0, -1);
        break;
      case 'sonosPort':
        this.sonosConfig.port = this.sonosConfig.port.slice(0, -1);
        break;
      case 'newClientName':
        this.newClientName = this.newClientName.slice(0, -1);
        break;
    }
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }

  deleteClient(clientId: string) {
    if (clientId === this.clientId) {
      console.log('Cannot delete current client');
      return;
    }
    
    const deleteUrl = environment.production ? '../api/clients/delete' : 'http://localhost:8200/api/clients/delete';
    
    this.http.delete(deleteUrl, { body: { clientId } }).subscribe({
      next: () => {
        this.loadClients();
      },
      error: (err) => {
        console.error('Failed to delete client:', err);
      }
    });
  }

  createNewClient() {
    const newClientId = 'client_' + Date.now();
    const createUrl = environment.production ? '../api/clients/create' : 'http://localhost:8200/api/clients/create';
    
    this.http.post(createUrl, {
      clientId: newClientId,
      name: this.newClientName
    }).subscribe({
      next: () => {
        this.clientService.setClientId(newClientId);
        this.clientId = newClientId;
        this.clientName = this.newClientName;
        this.newClientName = '';
        this.loadClients();
      },
      error: (err) => {
        console.error('Failed to create client:', err);
      }
    });
  }
}