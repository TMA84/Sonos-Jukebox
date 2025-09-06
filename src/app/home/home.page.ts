import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { MediaService } from '../media.service';
import { ArtworkService } from '../artwork.service';
import { PlayerService } from '../player.service';
import { ActivityIndicatorService } from '../activity-indicator.service';
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
  editButtonclickCount = 0;
  editClickTimer = 0;
  needsUpdate = false;
  availableCategories: string[] = [];

  constructor(
    private mediaService: MediaService,
    private artworkService: ArtworkService,
    private playerService: PlayerService,
    private activityIndicatorService: ActivityIndicatorService,
    private router: Router,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadAvailableCategories();
    this.mediaService.setCategory('audiobook');

    // Subscribe
    this.mediaService.getMedia().subscribe(media => {
      this.media = media;
      this.loadArtworkBatch(media.slice(0, 12)); // Load first batch only
    });

    this.mediaService.getArtists().subscribe(artists => {
      this.artists = artists;
      this.loadArtistArtworkBatch(artists.slice(0, 12)); // Load first batch only
    });

    this.update();
  }

  ionViewWillEnter() {
    if (this.needsUpdate) {
      this.update();
    }
  }

  ionViewDidLeave() {
    if (this.activityIndicatorVisible) {
      this.activityIndicatorService.dismiss();
      this.activityIndicatorVisible = false;
    }
  }

  categoryChanged(event: any) {
    this.category = event.detail.value;
    this.mediaService.setCategory(this.category);
    this.update();
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
        const navigationExtras: NavigationExtras = {
          state: {
            artist: clickedArtist
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
    this.mediaService.updateRawMedia();
    this.mediaService.getRawMediaObservable().subscribe(rawMedia => {
      this.availableCategories = [...new Set(rawMedia.map(item => item.category || 'audiobook'))];
      
      // If current category is not available, switch to first available
      if (this.availableCategories.length > 0 && !this.availableCategories.includes(this.category)) {
        this.category = this.availableCategories[0];
        this.categoryChanged({ detail: { value: this.category } });
      }
    });
  }
}
