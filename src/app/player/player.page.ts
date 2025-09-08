import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { ArtworkService } from '../artwork.service';
import { PlayerService, PlayerCmds } from '../player.service';
import { ClientService } from '../client.service';
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
  selectedSpeaker = '';
  availableSpeakers: string[] = [];
  enableSpeakerSelection = true;
  errorMessage = '';
  fromShortcut = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private artworkService: ArtworkService,
    private playerService: PlayerService,
    private clientService: ClientService
  ) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        const state = this.router.getCurrentNavigation().extras.state;
        this.media = state.media;
        this.fromShortcut = state.fromShortcut || false;
      }
    });
  }

  ngOnInit() {
    console.log('Player initialized with media:', this.media);
    
    if (this.media) {
      this.artworkService.getArtwork(this.media).subscribe(url => {
        this.cover = url;
      });
    }
    
    this.loadAvailableSpeakers();
    this.startStatusPolling();
    
    // Ensure auto-play starts if not already triggered
    if (this.media && !this.playing) {
      window.setTimeout(() => {
        this.playerService.playMedia(this.media);
        this.playing = true;
      }, 1500);
    }
  }

  ionViewWillEnter() {
    if (this.media) {
      console.log('Auto-playing media:', this.media.title, 'by', this.media.artist);
      
      // Store last played media
      localStorage.setItem('lastPlayedMedia', JSON.stringify(this.media));
      
      // Clear queue and start playing immediately
      this.playerService.sendCmd(PlayerCmds.CLEARQUEUE);
      
      // Start playing with shorter delay
      window.setTimeout(() => {
        this.playerService.playMedia(this.media);
        this.playing = true;
      }, 500);
    } else {
      // Load actual current status from player
      this.playerService.getCurrentTrack().subscribe(track => {
        if (track && track.title !== 'Unknown' && track.artist !== 'Unknown Artist') {
          this.currentTrack = track;
          this.playing = track.playbackState === 'PLAYING';
          
          // Create media object from current track
          this.media = {
            title: track.album || track.title,
            artist: track.artist,
            type: 'spotify',
            category: 'music'
          };
          
          console.log('Loaded current playing track:', this.media.title);
        } else {
          // Fallback to last played media
          const lastPlayed = localStorage.getItem('lastPlayedMedia');
          if (lastPlayed) {
            try {
              const parsedMedia = JSON.parse(lastPlayed);
              if (parsedMedia.title && parsedMedia.artist && parsedMedia.type) {
                this.media = parsedMedia;
                console.log('Loaded last played media:', this.media.title);
              } else {
                this.errorMessage = 'No valid media available. Please select an album from the library.';
              }
            } catch (e) {
              this.errorMessage = 'No media currently playing. Please select an album from the library.';
            }
          } else {
            this.errorMessage = 'No media currently playing. Please select an album from the library.';
          }
        }
        
        if (this.media) {
          console.log('Final media object:', this.media);
          if (!this.media.title || !this.media.artist || !this.media.type) {
            console.log('Media object is invalid, setting error message');
            this.errorMessage = 'Invalid media data. Please select an album from the library.';
            this.media = null;
          } else {
            this.artworkService.getArtwork(this.media).subscribe(url => {
              this.cover = url;
            });
          }
        } else {
          console.log('No media object, error message should be set:', this.errorMessage);
        }
      });
    }
  }

  ionViewWillLeave() {
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
    if (!this.media || !this.media.title || !this.media.artist || !this.media.type) {
      console.log('Cannot play/pause: invalid media');
      return;
    }
    
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

  loadAvailableSpeakers() {
    // Load speaker selection setting for current client from server
    const clientId = this.clientService.getClientId();
    const configUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
    
    this.http.get<any>(configUrl, { 
      params: { clientId: clientId }
    }).subscribe(config => {
      this.enableSpeakerSelection = config.enableSpeakerSelection !== false && !this.fromShortcut;
      
      if (!this.enableSpeakerSelection) return;
      
      const configData = localStorage.getItem('sonosConfig');
      
      if (configData) {
        const sonosConfig = JSON.parse(configData);
        this.availableSpeakers = sonosConfig.rooms || [];
      }
      
      // Check for temporary speaker selection first, then client default
      const tempSpeaker = sessionStorage.getItem('tempSelectedSpeaker');
      const defaultSpeaker = localStorage.getItem('selectedSpeaker');
      const currentSpeaker = tempSpeaker || defaultSpeaker;
      
      if (currentSpeaker && this.availableSpeakers.includes(currentSpeaker)) {
        this.selectedSpeaker = currentSpeaker;
      } else if (this.availableSpeakers.length > 0) {
        this.selectedSpeaker = this.availableSpeakers[0];
        // Only set localStorage if no temporary selection exists
        if (!tempSpeaker) {
          localStorage.setItem('selectedSpeaker', this.selectedSpeaker);
        }
      }
      
      console.log('Current selected speaker:', this.selectedSpeaker, '(temp:', tempSpeaker, 'default:', defaultSpeaker, ')');
    });
  }

  speakerChanged(event: any) {
    const newSpeaker = event.detail.value;
    const tempSpeaker = sessionStorage.getItem('tempSelectedSpeaker');
    const defaultSpeaker = localStorage.getItem('selectedSpeaker');
    const previousSpeaker = tempSpeaker || defaultSpeaker;
    
    console.log('Switching from', previousSpeaker, 'to', newSpeaker);
    
    // Stop playing in previous speaker first
    if (previousSpeaker && previousSpeaker !== newSpeaker) {
      console.log('Stopping previous speaker:', previousSpeaker);
      this.playerService.stopSpeaker(previousSpeaker);
    }
    
    // Update selected speaker (store as temporary selection)
    this.selectedSpeaker = newSpeaker;
    
    // Switch to new speaker and restart playback only if we have valid media
    this.playerService.switchSpeaker(this.selectedSpeaker).then(() => {
      console.log('Checking media for playback:', this.media);
      if (this.media && 
          this.media.title && this.media.title !== 'undefined' && 
          this.media.artist && this.media.artist !== 'undefined' && 
          this.media.type && this.media.type !== 'undefined') {
        window.setTimeout(() => {
          console.log('Starting playback on new speaker:', this.selectedSpeaker, 'with media:', this.media);
          this.playerService.playMedia(this.media);
        }, 1500);
      } else {
        console.log('No valid media to play on new speaker, skipping playback. Media:', this.media);
      }
    });
  }
}
