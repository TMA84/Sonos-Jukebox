import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ArtworkService } from '../artwork.service';
import { PlayerService, PlayerCmds } from '../player.service';
import { Media } from '../media';

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
})
export class PlayerPage implements OnInit {

  media: Media;
  cover = '';
  playing = true;
  currentTrack: any = null;
  statusInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private artworkService: ArtworkService,
    private playerService: PlayerService
  ) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.media = this.router.getCurrentNavigation().extras.state.media;
      }
    });
  }

  ngOnInit() {
    this.artworkService.getArtwork(this.media).subscribe(url => {
      this.cover = url;
    });
    this.startStatusPolling();
  }

  ionViewWillEnter() {
    if (this.media) {
      this.playerService.sendCmd(PlayerCmds.CLEARQUEUE);

      window.setTimeout(() => {
        this.playerService.playMedia(this.media);
      }, 1000);
    }
  }

  ionViewWillLeave() {
    this.playerService.sendCmd(PlayerCmds.PAUSE);
    this.stopStatusPolling();
  }

  volUp() {
    this.playerService.sendCmd(PlayerCmds.VOLUMEUP);
  }

  volDown() {
    this.playerService.sendCmd(PlayerCmds.VOLUMEDOWN);
  }

  skipPrev() {
    this.playerService.sendCmd(PlayerCmds.PREVIOUS);
  }

  skipNext() {
    this.playerService.sendCmd(PlayerCmds.NEXT);
  }

  playPause() {
    if (this.playing) {
      this.playing = false;
      this.playerService.sendCmd(PlayerCmds.PAUSE);
    } else {
      this.playing = true;
      this.playerService.sendCmd(PlayerCmds.PLAY);
    }
  }

  startStatusPolling() {
    this.statusInterval = setInterval(() => {
      this.playerService.getCurrentTrack().subscribe(track => {
        this.currentTrack = track;
        this.playing = track?.playbackState === 'PLAYING';
      });
    }, 2000);
  }

  stopStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }
}
