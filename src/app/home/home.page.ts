import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MediaService } from '../media.service';
import { ArtworkService } from '../artwork.service';
import { PlayerService } from '../player.service';
import { ActivityIndicatorService } from '../activity-indicator.service';
import { ClientService } from '../client.service';
import { PinDialogComponent } from '../pin-dialog/pin-dialog.component';
import { Artist } from '../artist';
import { Media } from '../media';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  category = 'audiobook';
  artists: Artist[] = [];
  media: Media[] = [];
  covers = {};
  activityIndicatorVisible = false;
  needsUpdate = false;
  availableCategories: string[] = [];
  showKeyboard = false;
  isUpperCase = false;
  showSearch = false;
  searchTerm = '';
  activeInput = '';
  filteredArtists: Artist[] = [];
  filteredMedia: Media[] = [];
  clientName = '';
  hasMoreArtists = true;
  currentPage = 0;
  pageSize = 12;
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  constructor(
    private mediaService: MediaService,
    private artworkService: ArtworkService,
    private playerService: PlayerService,
    private activityIndicatorService: ActivityIndicatorService,
    private clientService: ClientService,
    private router: Router,
    private modalController: ModalController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadAvailableCategories();
    this.loadClientName();
    this.loadDefaultSpeaker();
    this.loadLibraryData();
  }

  loadDefaultSpeaker() {
    const configUrl = environment.production ? '../api/config' : 'http://localhost:8200/api/config';
    this.http.get<any>(configUrl, {
      params: { clientId: this.getClientId() }
    }).subscribe(config => {
      if (config.currentRoom) {
        localStorage.setItem('selectedSpeaker', config.currentRoom);
      }
    });
  }

  loadLibraryData() {
    const clientId = this.getClientId();
    console.log('Loading library for client:', clientId);
    
    // Clear previous data
    this.artists = [];
    this.media = [];
    this.filteredArtists = [];
    this.filteredMedia = [];
    
    this.mediaService.setCategory(this.category);
    
    // Load artists directly without albums/tracks to avoid rate limiting
    this.mediaService.getArtists().subscribe(artists => {
      console.log('Artists loaded:', artists.length);
      this.artists = artists;
      this.currentPage = 0;
      this.loadInitialArtists();
    });
  }

  ionViewWillEnter() {
    console.log('Home page entering, reloading data');
    // Always reload data when entering home page
    this.loadLibraryData();
    this.loadAvailableCategories();
    this.loadClientName();
    this.needsUpdate = false;
  }

  ionViewDidLeave() {
    if (this.activityIndicatorVisible) {
      this.activityIndicatorService.dismiss();
      this.activityIndicatorVisible = false;
    }
  }

  categoryChanged(event: any) {
    this.category = event.detail.value;
    console.log('Category changed to:', this.category);
    this.loadLibraryData();
  }

  update() {
    this.mediaService.getArtists().subscribe(artists => {
      this.artists = artists;
      this.currentPage = 0;
      this.loadInitialArtists();
    });
    this.needsUpdate = false;
  }

  artistCoverClicked(clickedArtist: Artist) {
    this.activityIndicatorService.create().then(indicator => {
      this.activityIndicatorVisible = true;
      indicator.present().then(() => {
        // Add client ID to artist data
        const artistWithClient = {
          ...clickedArtist,
          clientId: this.getClientId()
        };
        
        const navigationExtras: NavigationExtras = {
          state: {
            artist: artistWithClient
          }
        };
        this.router.navigate(['/medialist'], navigationExtras);
      });
    });
  }

  artistNameClicked(clickedArtist: Artist) {
    this.playerService.getConfig().subscribe(config => {
      if (config.tts == null || config.tts.enabled === true) {
        this.playerService.say(clickedArtist.name);
      }
    });
  }

  mediaCoverClicked(clickedMedia: Media) {
    // Start playing immediately
    this.playerService.playMedia(clickedMedia);
    
    const navigationExtras: NavigationExtras = {
      state: {
        media: clickedMedia
      }
    };
    this.router.navigate(['/player'], navigationExtras);
  }

  mediaNameClicked(clickedMedia: Media) {
    this.playerService.getConfig().subscribe(config => {
      if (config.tts == null || config.tts.enabled === true) {
        this.playerService.say(clickedMedia.title);
      }
    });
  }

  private loadArtworkBatch(items: Media[]) {
    items.forEach(currentMedia => {
      this.artworkService.getArtwork(currentMedia).subscribe(url => {
        this.covers[currentMedia.title] = url;
      });
    });
  }

  private loadArtistArtworkBatch(artists: Artist[]) {
    artists.forEach(artist => {
      this.artworkService.getArtwork(artist.coverMedia).subscribe(url => {
        this.covers[artist.name] = url;
      });
    });
  }

  loadMoreMediaArtwork(items: Media[]) {
    this.loadArtworkBatch(items);
  }

  loadMoreArtistArtwork(items: Artist[]) {
    this.loadArtistArtworkBatch(items);
  }

  async configButtonPressed() {
    const modal = await this.modalController.create({
      component: PinDialogComponent,
      cssClass: 'pin-dialog-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data === true) {
        this.router.navigate(['/config']);
      }
    });

    return await modal.present();
  }

  loadAvailableCategories() {
    // Load from server API
    const clientId = this.getClientId();
    console.log('Loading categories for client:', clientId);
    
    this.mediaService.updateRawMedia();
    this.mediaService.getRawMediaObservable().subscribe(libraryItems => {
      console.log('Categories - library items:', libraryItems.length);
      
      this.availableCategories = [...new Set(libraryItems.map((item: any) => item.category || 'audiobook'))] as string[];
      
      if (this.availableCategories.length === 0) {
        this.availableCategories = ['audiobook', 'music', 'playlist', 'radio'];
      }
      
      if (!this.availableCategories.includes(this.category)) {
        this.category = this.availableCategories[0];
      }
    });
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.onSearch();
    }
  }

  setActiveInput(input: string) {
    this.activeInput = input;
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.loadInitialArtists();
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const searchResults = this.artists.filter(artist => 
      artist.name.toLowerCase().includes(term)
    );
    
    this.filteredArtists = searchResults.slice(0, this.pageSize);
    this.hasMoreArtists = searchResults.length > this.pageSize;
    this.currentPage = 0;
  }

  addKey(key: string) {
    const keyToAdd = this.isUpperCase ? key.toUpperCase() : key;
    switch (this.activeInput) {
      case 'search':
        this.searchTerm += keyToAdd;
        this.onSearch();
        break;
    }
  }

  backspace() {
    switch (this.activeInput) {
      case 'search':
        this.searchTerm = this.searchTerm.slice(0, -1);
        this.onSearch();
        break;
    }
  }



  getClientId(): string {
    // Use ClientService to get current client ID
    const clientId = this.clientService.getClientId();
    console.log('Current client ID from service:', clientId);
    return clientId;
  }

  loadClientName() {
    const clientId = this.getClientId();
    console.log('Loading client name for:', clientId);
    const storedName = localStorage.getItem(`clientName_${clientId}`);
    console.log('Found client name:', storedName);
    this.clientName = storedName || '';
    
    // If no name found, try to get from current client service
    if (!this.clientName && clientId !== 'default') {
      this.clientName = `Client ${clientId.replace('client_', '')}`;
    }
  }

  goToPlayer() {
    const navigationExtras: NavigationExtras = {
      state: {
        fromShortcut: true
      }
    };
    this.router.navigate(['/player'], navigationExtras);
  }

  loadInitialArtists() {
    this.currentPage = 0;
    const startIndex = 0;
    const endIndex = this.pageSize;
    this.filteredArtists = this.artists.slice(startIndex, endIndex);
    this.hasMoreArtists = this.artists.length > endIndex;
    this.loadArtistArtworkBatch(this.filteredArtists.slice(0, 6));
  }

  loadMoreArtists(event: any) {
    setTimeout(() => {
      this.currentPage++;
      const startIndex = this.currentPage * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const newArtists = this.artists.slice(startIndex, endIndex);
      
      this.filteredArtists = [...this.filteredArtists, ...newArtists];
      this.hasMoreArtists = this.artists.length > endIndex;
      
      // Load artwork for new artists
      this.loadArtistArtworkBatch(newArtists);
      
      event.target.complete();
      
      if (!this.hasMoreArtists) {
        event.target.disabled = true;
      }
    }, 500);
  }
}
