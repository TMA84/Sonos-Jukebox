import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { ModalController } from '@ionic/angular';
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
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadLibraryData();
    this.loadAvailableCategories();
    this.loadClientName();
  }

  loadLibraryData() {
    // Load from client-specific key
    const clientId = this.getClientId();
    console.log('Loading library for client:', clientId);
    const stored = localStorage.getItem(`libraryItems_${clientId}`);
    console.log('Stored data for client', clientId, ':', stored);
    const libraryItems = stored ? JSON.parse(stored) : [];
    console.log('Library items:', libraryItems);
    
    // Clear previous data
    this.artists = [];
    this.media = [];
    this.filteredArtists = [];
    this.filteredMedia = [];
    
    if (this.category === 'audiobook' || this.category === 'music') {
      const categoryItems = libraryItems.filter(item => item.category === this.category);
      console.log('Category items for', this.category, ':', categoryItems.length);
      
      // Group by artist to create artist entries
      const artistMap = new Map();
      categoryItems.forEach(item => {
        if (!artistMap.has(item.artist)) {
          artistMap.set(item.artist, {
            name: item.artist,
            coverMedia: item,
            albumCount: '1'
          });
        } else {
          const existing = artistMap.get(item.artist);
          existing.albumCount = (parseInt(existing.albumCount) + 1).toString();
        }
      });
      
      this.artists = Array.from(artistMap.values());
      this.filteredArtists = this.artists;
      this.loadArtistArtworkBatch(this.artists.slice(0, 12));
    } else {
      this.media = libraryItems.filter(item => item.category === this.category);
      console.log('Media items for', this.category, ':', this.media.length);
      this.filteredMedia = this.media;
      this.loadArtworkBatch(this.media.slice(0, 12));
    }
    console.log('Loaded artists:', this.artists.length, 'media:', this.media.length);
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
    if (this.category === 'audiobook' || this.category === 'music') {
      this.mediaService.publishArtists();
    } else {
      this.mediaService.publishMedia();
    }
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
    // Load from client-specific key
    const clientId = this.getClientId();
    console.log('Loading categories for client:', clientId);
    const stored = localStorage.getItem(`libraryItems_${clientId}`);
    const libraryItems = stored ? JSON.parse(stored) : [];
    console.log('Categories - library items:', libraryItems.length);
    
    this.availableCategories = [...new Set(libraryItems.map((item: any) => item.category || 'audiobook'))] as string[];
    
    if (this.availableCategories.length === 0) {
      this.availableCategories = ['audiobook', 'music', 'playlist', 'radio'];
    }
    
    if (!this.availableCategories.includes(this.category)) {
      this.category = this.availableCategories[0];
    }
    
    this.loadLibraryData();
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
      this.filteredArtists = this.artists;
      this.filteredMedia = this.media;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredArtists = this.artists.filter(artist => 
      artist.name.toLowerCase().includes(term)
    );
    this.filteredMedia = this.media.filter(media => 
      media.title.toLowerCase().includes(term) || 
      media.artist.toLowerCase().includes(term)
    );
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
}
