import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController, ModalController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { ClientService } from '../client.service';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ArtistSearchComponent } from '../artist-search/artist-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';

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
  amazonConfig = { accessKey: '', secretKey: '' };
  appleConfig = { developerToken: '', teamId: '' };
  tuneinConfig = { apiKey: '', partnerId: '' };
  sonosConfig = { server: '', port: '' };
  selectedTab = 'library';
  showKeyboard = false;
  selectedService = 'spotify';

  activeInput = '';

  libraryCategory = 'audiobook';
  librarySource = 'spotify';
  libraryArtist = '';
  libraryTitle = '';
  libraryItems: any[] = [];
  enableSpeakerSelection = true;
  selectedClientId = '';
  serviceConfigured = {
    spotify: false,
    amazonmusic: false,
    applemusic: false,
    tunein: false
  };

  constructor(
    private http: HttpClient,
    private clientService: ClientService,
    private router: Router,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.clientId = this.clientService.getClientId();
    this.selectedClientId = this.clientId;
    this.loadClients();
    this.loadCurrentConfig();
    this.loadFullConfig();
    this.loadClientName();
    this.loadLibraryItems();
    this.loadSpeakerSelectionSetting();
    this.findSpeakers(); // Automatically load speakers on page load
  }

  loadCurrentConfig() {
    const configUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.get<any>(configUrl, { 
      params: { clientId: this.clientId }
    }).subscribe(config => {
      this.selectedSpeaker = config.room || '';
    });
  }

  findSpeakers() {
    this.isLoading = true;
    const speakersUrl = environment.production ? '../api/speakers' : 'http://localhost:8200/api/speakers';
    
    this.http.get<any[]>(speakersUrl).subscribe({
      next: (speakers) => {
        this.speakers = speakers;
        
        // Save available speakers for home page
        const speakerNames = speakers.map(s => this.getSpeakerName(s));
        const sonosConfig = {
          rooms: speakerNames,
          server: this.sonosConfig.server,
          port: this.sonosConfig.port
        };
        localStorage.setItem('sonosConfig', JSON.stringify(sonosConfig));
        
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
    
    // Save to localStorage for home page access
    localStorage.setItem('selectedSpeaker', speaker);
    
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
      this.amazonConfig = {
        accessKey: config.amazonmusic?.accessKey || '',
        secretKey: config.amazonmusic?.secretKey || ''
      };
      this.appleConfig = {
        developerToken: config.applemusic?.developerToken || '',
        teamId: config.applemusic?.teamId || ''
      };
      this.tuneinConfig = {
        apiKey: config.tunein?.apiKey || '',
        partnerId: config.tunein?.partnerId || ''
      };
      this.sonosConfig = {
        server: config['node-sonos-http-api']?.server || '',
        port: config['node-sonos-http-api']?.port || ''
      };
      
      // Update service configuration status
      this.serviceConfigured.spotify = !!(this.spotifyConfig.clientId && this.spotifyConfig.clientSecret);
      this.serviceConfigured.amazonmusic = !!(this.amazonConfig.accessKey && this.amazonConfig.secretKey);
      this.serviceConfigured.applemusic = !!(this.appleConfig.developerToken && this.appleConfig.teamId);
      this.serviceConfigured.tunein = !!(this.tuneinConfig.apiKey && this.tuneinConfig.partnerId);
    });
  }

  saveSpotifyConfig() {
    const saveUrl = environment.production ? '../api/config/spotify' : 'http://localhost:8200/api/config/spotify';
    this.http.post(saveUrl, this.spotifyConfig).subscribe({
      next: () => console.log('Spotify configuration saved'),
      error: (err) => console.error('Failed to save Spotify config:', err)
    });
  }

  saveAmazonConfig() {
    const saveUrl = environment.production ? '../api/config/amazon' : 'http://localhost:8200/api/config/amazon';
    this.http.post(saveUrl, this.amazonConfig).subscribe({
      next: () => console.log('Amazon Music configuration saved'),
      error: (err) => console.error('Failed to save Amazon config:', err)
    });
  }

  saveAppleConfig() {
    const saveUrl = environment.production ? '../api/config/apple' : 'http://localhost:8200/api/config/apple';
    this.http.post(saveUrl, this.appleConfig).subscribe({
      next: () => console.log('Apple Music configuration saved'),
      error: (err) => console.error('Failed to save Apple config:', err)
    });
  }

  saveTuneinConfig() {
    const saveUrl = environment.production ? '../api/config/tunein' : 'http://localhost:8200/api/config/tunein';
    this.http.post(saveUrl, this.tuneinConfig).subscribe({
      next: () => console.log('TuneIn configuration saved'),
      error: (err) => console.error('Failed to save TuneIn config:', err)
    });
  }

  saveSonosConfig() {
    const saveUrl = environment.production ? '../api/config/sonos' : 'http://localhost:8200/api/config/sonos';
    this.http.post(saveUrl, this.sonosConfig).subscribe({
      next: () => console.log('Sonos configuration saved'),
      error: (err) => console.error('Failed to save Sonos config:', err)
    });
  }

  tabChanged(event: any) {
    this.selectedTab = event.detail.value;
  }

  loadClientName() {
    this.clientService.getClientName().subscribe(name => {
      this.clientName = name;
    });
  }

  async saveClientName() {
    const saveUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.post(saveUrl, { 
      clientId: this.clientId,
      name: this.clientName 
    }, { responseType: 'text' }).subscribe({
      next: async (response) => {
        console.log('Client name saved:', response);
        // Clear cache to force reload of updated name
        this.clientService['clientNameCache'] = null;
        const toast = await this.toastController.create({
          message: 'Client name saved successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Failed to save client name:', err);
        const toast = await this.toastController.create({
          message: 'Failed to save client name',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  loadClients() {
    const clientsUrl = environment.production ? '../api/clients' : 'http://localhost:8200/api/clients';
    this.http.get<any[]>(clientsUrl).subscribe(clients => {
      this.availableClients = clients.map(client => {
        const displayName = client.name || `Client ${client.id.replace('client-', '').replace('client_', '')}`;
        return {
          ...client,
          name: displayName
        };
      });
    });
  }

  async switchToClient(clientId: string) {
    this.clientService.setClientId(clientId);
    this.clientId = clientId;
    this.selectedClientId = clientId;
    this.loadCurrentConfig();
    this.loadClientName();
    this.loadLibraryItems(); // Reload library for new client
    this.loadSpeakerSelectionSetting(); // Reload speaker setting for new client
    
    const toast = await this.toastController.create({
      message: 'Client switched successfully',
      duration: 2000,
      color: 'success'
    });
    toast.present();
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
    if (this.showKeyboard) {
      this.setFirstInputForCurrentTab();
    }
  }

  setFirstInputForCurrentTab() {
    switch (this.selectedTab) {
      case 'clients':
        this.activeInput = 'clientName';
        break;
      case 'speakers':
        this.activeInput = '';
        break;
      case 'services':
        this.activeInput = this.getFirstServiceInput();
        break;
      case 'library':
        this.activeInput = 'libraryArtist';
        break;
      case 'security':
        this.activeInput = 'currentPin';
        break;
      default:
        this.activeInput = 'clientName';
    }
  }

  getFirstServiceInput(): string {
    switch (this.selectedService) {
      case 'spotify': return 'spotifyClientId';
      case 'amazon': return 'amazonAccessKey';
      case 'apple': return 'appleDeveloperToken';
      case 'tunein': return 'tuneinApiKey';
      case 'sonos': return 'sonosServer';
      default: return 'spotifyClientId';
    }
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  setActiveInput(inputName: string) {
    this.activeInput = inputName;
  }

  addKey(key: string) {
    switch (this.activeInput) {
      case 'currentPin':
        this.currentPin += key;
        break;
      case 'newPin':
        this.newPin += key;
        break;
      case 'confirmPin':
        this.confirmPin += key;
        break;
      case 'clientName':
        this.clientName += key;
        break;
      case 'spotifyClientId':
        this.spotifyConfig.clientId += key;
        break;
      case 'spotifyClientSecret':
        this.spotifyConfig.clientSecret += key;
        break;
      case 'sonosServer':
        this.sonosConfig.server += key;
        break;
      case 'sonosPort':
        this.sonosConfig.port += key;
        break;
      case 'amazonAccessKey':
        this.amazonConfig.accessKey += key;
        break;
      case 'amazonSecretKey':
        this.amazonConfig.secretKey += key;
        break;
      case 'appleDeveloperToken':
        this.appleConfig.developerToken += key;
        break;
      case 'appleTeamId':
        this.appleConfig.teamId += key;
        break;
      case 'tuneinApiKey':
        this.tuneinConfig.apiKey += key;
        break;
      case 'tuneinPartnerId':
        this.tuneinConfig.partnerId += key;
        break;
      case 'newClientName':
        this.newClientName += key;
        break;
      case 'libraryArtist':
        this.libraryArtist += key;
        break;
      case 'libraryTitle':
        this.libraryTitle += key;
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
      case 'amazonAccessKey':
        this.amazonConfig.accessKey = this.amazonConfig.accessKey.slice(0, -1);
        break;
      case 'amazonSecretKey':
        this.amazonConfig.secretKey = this.amazonConfig.secretKey.slice(0, -1);
        break;
      case 'appleDeveloperToken':
        this.appleConfig.developerToken = this.appleConfig.developerToken.slice(0, -1);
        break;
      case 'appleTeamId':
        this.appleConfig.teamId = this.appleConfig.teamId.slice(0, -1);
        break;
      case 'tuneinApiKey':
        this.tuneinConfig.apiKey = this.tuneinConfig.apiKey.slice(0, -1);
        break;
      case 'tuneinPartnerId':
        this.tuneinConfig.partnerId = this.tuneinConfig.partnerId.slice(0, -1);
        break;
      case 'newClientName':
        this.newClientName = this.newClientName.slice(0, -1);
        break;
      case 'libraryArtist':
        this.libraryArtist = this.libraryArtist.slice(0, -1);
        break;
      case 'libraryTitle':
        this.libraryTitle = this.libraryTitle.slice(0, -1);
        break;
    }
  }



  async deleteClient(clientId: string) {
    if (clientId === this.clientId) {
      const toast = await this.toastController.create({
        message: 'Cannot delete currently selected client',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    const deleteUrl = environment.production ? '../api/clients/delete' : 'http://localhost:8200/api/clients/delete';
    
    this.http.post(deleteUrl, { clientId }, { responseType: 'text' }).subscribe({
      next: async (response) => {
        console.log('Client deleted:', response);
        this.loadClients();
        const toast = await this.toastController.create({
          message: 'Client deleted successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Failed to delete client:', err);
        const toast = await this.toastController.create({
          message: 'Failed to delete client',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  async createNewClient() {
    const newClientId = 'client_' + Date.now();
    const createUrl = environment.production ? '../api/clients/create' : 'http://localhost:8200/api/clients/create';
    
    this.http.post(createUrl, {
      clientId: newClientId,
      name: this.newClientName
    }, { responseType: 'text' }).subscribe({
      next: async (response) => {
        console.log('Client created:', response);
        
        this.clientService.setClientId(newClientId);
        this.clientId = newClientId;
        this.selectedClientId = newClientId;
        this.clientName = this.newClientName;
        this.newClientName = '';
        this.loadClients();
        this.loadLibraryItems(); // Load library for new client
        
        const toast = await this.toastController.create({
          message: 'Client created successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Failed to create client:', err);
        const toast = await this.toastController.create({
          message: 'Failed to create client',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  loadLibraryItems() {
    // Load from server API
    const dataUrl = environment.production ? '../api/data' : 'http://localhost:8200/api/data';
    this.http.get<any[]>(dataUrl, {
      params: { clientId: this.clientId }
    }).subscribe({
      next: (items) => {
        this.libraryItems = items || [];
        console.log('Loaded library items from server:', this.libraryItems.length);
      },
      error: (err) => {
        console.error('Failed to load library items:', err);
        this.libraryItems = [];
      }
    });
  }







  addToLibrary() {
    if (!this.libraryArtist || !this.libraryTitle) return;
    
    const item = {
      artist: this.libraryArtist,
      title: this.libraryTitle,
      type: this.librarySource,
      category: this.libraryCategory,
      contentType: 'album',
      clientId: this.clientId
    };
    
    // Save to server via API
    const addUrl = environment.production ? '../api/add' : 'http://localhost:8200/api/add';
    this.http.post(addUrl, item).subscribe({
      next: () => {
        console.log('Manual item added to server:', item);
        this.loadLibraryItems(); // Reload from server
        this.libraryArtist = '';
        this.libraryTitle = '';
      },
      error: (err) => {
        console.error('Failed to add manual item to server:', err);
      }
    });
  }

  removeFromLibrary(index: number) {
    const deleteUrl = environment.production ? '../api/delete' : 'http://localhost:8200/api/delete';
    this.http.post(deleteUrl, {
      index: index,
      clientId: this.clientId
    }).subscribe({
      next: () => {
        console.log('Item deleted from server');
        this.loadLibraryItems(); // Reload from server
      },
      error: (err) => {
        console.error('Failed to delete item:', err);
      }
    });
  }

  openAddPage() {
    this.router.navigate(['/add']);
  }

  openEditPage() {
    this.router.navigate(['/edit']);
  }

  async openAlbumSearch() {
    const modal = await this.modalController.create({
      component: AlbumSearchComponent,
      cssClass: 'album-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addAlbumFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  async openArtistSearch() {
    const modal = await this.modalController.create({
      component: ArtistSearchComponent,
      cssClass: 'artist-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addArtistFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  addAlbumFromSearch(album: any) {
    const item = {
      artist: album.artist,
      title: album.title,
      type: 'spotify',
      category: this.libraryCategory,
      cover: album.cover,
      id: album.id,
      contentType: 'album',
      clientId: this.clientId
    };
    
    // Save to server via API
    const addUrl = environment.production ? '../api/add' : 'http://localhost:8200/api/add';
    this.http.post(addUrl, item).subscribe({
      next: () => {
        console.log('Album added to server:', item);
        this.loadLibraryItems(); // Reload from server
      },
      error: (err) => {
        console.error('Failed to add album to server:', err);
      }
    });
  }

  addArtistFromSearch(artist: any) {
    const item = {
      artist: artist.name,
      title: `All ${artist.name} Albums`,
      type: 'spotify',
      category: this.libraryCategory,
      cover: artist.image,
      artistid: artist.id,
      contentType: 'artist',
      clientId: this.clientId
    };
    
    // Save to server via API
    const addUrl = environment.production ? '../api/add' : 'http://localhost:8200/api/add';
    this.http.post(addUrl, item).subscribe({
      next: () => {
        console.log('Artist added to server:', item);
        this.loadLibraryItems(); // Reload from server
      },
      error: (err) => {
        console.error('Failed to add artist to server:', err);
      }
    });
  }

  async openServiceSearch() {
    const modal = await this.modalController.create({
      component: ServiceSearchComponent,
      componentProps: {
        service: this.librarySource,
        category: this.libraryCategory
      },
      cssClass: 'service-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addServiceFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  addServiceFromSearch(content: any) {
    const item = {
      artist: content.artist || '',
      title: content.title,
      type: this.librarySource,
      category: this.libraryCategory,
      cover: content.cover,
      id: content.id,
      contentType: 'album',
      clientId: this.clientId
    };
    
    // Save to server via API
    const addUrl = environment.production ? '../api/add' : 'http://localhost:8200/api/add';
    this.http.post(addUrl, item).subscribe({
      next: () => {
        console.log('Service content added to server:', item);
        this.loadLibraryItems(); // Reload from server
      },
      error: (err) => {
        console.error('Failed to add service content to server:', err);
      }
    });
  }

  getServiceName(): string {
    switch (this.librarySource) {
      case 'amazonmusic': return 'Amazon Music';
      case 'applemusic': return 'Apple Music';
      case 'tunein': return 'TuneIn Radio';
      default: return '';
    }
  }

  loadSpeakerSelectionSetting() {
    const configUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.get<any>(configUrl, { 
      params: { clientId: this.clientId }
    }).subscribe(config => {
      this.enableSpeakerSelection = config.enableSpeakerSelection !== false;
    });
  }

  async saveSpeakerSelectionSetting() {
    const saveUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    this.http.post(saveUrl, { 
      clientId: this.clientId,
      enableSpeakerSelection: this.enableSpeakerSelection
    }, { responseType: 'text' }).subscribe({
      next: async (response) => {
        console.log('Speaker selection setting saved:', response);
        const toast = await this.toastController.create({
          message: 'Speaker selection setting saved',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Failed to save speaker selection setting:', err);
        const toast = await this.toastController.create({
          message: 'Failed to save speaker selection setting',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  clientSelectionChanged(event: any) {
    const newClientId = event.detail.value;
    this.switchToClient(newClientId);
    this.selectedClientId = newClientId;
  }

  nextInput() {
    const inputOrder = [
      'clientName', 'newClientName', 'spotifyClientId', 'spotifyClientSecret',
      'amazonAccessKey', 'amazonSecretKey', 'appleDeveloperToken', 'appleTeamId',
      'tuneinApiKey', 'tuneinPartnerId', 'sonosServer', 'sonosPort',
      'libraryArtist', 'libraryTitle', 'currentPin', 'newPin', 'confirmPin'
    ];
    
    const currentIndex = inputOrder.indexOf(this.activeInput);
    if (currentIndex >= 0 && currentIndex < inputOrder.length - 1) {
      this.activeInput = inputOrder[currentIndex + 1];
    } else {
      this.activeInput = inputOrder[0];
    }
  }
}