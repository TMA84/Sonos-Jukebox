import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { ArtworkService } from '../artwork.service';
import { PlayerService, PlayerCmds } from '../player.service';
import { ClientService } from '../client.service';
import { AutoplayService } from '../autoplay.service';
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
  scheduleCheckInterval: any;
  selectedSpeaker = '';
  availableSpeakers: string[] = [];
  enableSpeakerSelection = true;
  errorMessage = '';
  fromShortcut = false;
  autoplayEnabled = true;
  repeatEnabled = false;
  lastTrackUri = '';
  isCheckingForNext = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private artworkService: ArtworkService,
    private playerService: PlayerService,
    private clientService: ClientService,
    private autoplayService: AutoplayService
  ) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        const state = this.router.getCurrentNavigation().extras.state;
        this.media = state.media;
        this.fromShortcut = state.fromShortcut || false;
      }
    });
  }

  async ngOnInit() {
    console.log('Player initialized with media:', this.media);

    if (this.media) {
      this.artworkService.getArtwork(this.media).subscribe(url => {
        this.cover = url;
      });

      // Build autoplay queue for current media
      await this.autoplayService.buildQueue(this.media);
    }

    // Subscribe to autoplay enabled state
    this.autoplayService.isEnabled().subscribe(enabled => {
      this.autoplayEnabled = enabled;
    });

    // Subscribe to repeat enabled state
    this.autoplayService.isRepeatEnabled().subscribe(enabled => {
      this.repeatEnabled = enabled;
    });

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

  async ionViewWillEnter() {
    // Start schedule enforcement check
    this.startScheduleCheck();

    if (this.media) {
      console.log('Auto-playing media:', this.media.title, 'by', this.media.artist);

      // Store last played media
      localStorage.setItem('lastPlayedMedia', JSON.stringify(this.media));

      // Build autoplay queue
      await this.autoplayService.buildQueue(this.media);

      // Start playing immediately
      this.playerService.playMedia(this.media);
      this.playing = true;
      this.playing = true;
    } else {
      // Load actual current status from player
      this.playerService.getCurrentTrack().subscribe(track => {
        if (track && track.title !== 'Unknown' && track.artist !== 'Unknown Artist') {
          this.currentTrack = track;
          this.playing = track.playbackState === 'PLAYING';

          // Create media object from current track
          console.log('Creating media from current track:', track);
          this.media = {
            title: track.album || track.title,
            artist: track.artist,
            type: 'spotify',
            category: 'music',
            id: this.extractSpotifyId(track),
          };
          console.log('Created media object:', this.media);

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
                this.errorMessage =
                  'No valid media available. Please select an album from the library.';
              }
            } catch (e) {
              this.errorMessage =
                'No media currently playing. Please select an album from the library.';
            }
          } else {
            this.errorMessage =
              'No media currently playing. Please select an album from the library.';
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
    this.stopScheduleCheck();
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
        const previousTrackUri = this.lastTrackUri;
        this.currentTrack = track;
        this.playing = track?.playbackState === 'PLAYING';

        // Store the track URI
        if (track?.trackUri) {
          this.lastTrackUri = track.trackUri;
        }

        // Check if playback stopped (album/show ended) - ONLY trigger on STOPPED state
        if (previousTrackUri && track?.playbackState === 'STOPPED' && !this.isCheckingForNext) {
          // Playback stopped - check if we should autoplay next
          this.checkAndPlayNext();
        }
      });
    }, 2000);
  }

  private async checkAndPlayNext() {
    // Check if either autoplay or repeat is enabled
    if ((!this.autoplayEnabled && !this.repeatEnabled) || this.isCheckingForNext) {
      console.log('Autoplay/Repeat check skipped:', {
        autoplayEnabled: this.autoplayEnabled,
        repeatEnabled: this.repeatEnabled,
        isCheckingForNext: this.isCheckingForNext,
      });
      return;
    }

    this.isCheckingForNext = true;
    console.log('Checking for next item to play...', {
      autoplay: this.autoplayEnabled,
      repeat: this.repeatEnabled,
    });

    try {
      // Wait a moment to ensure playback has actually stopped
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check again if still not playing (not just paused temporarily)
      const currentStatus = await this.playerService.getCurrentTrack().toPromise();
      console.log('Current playback status:', currentStatus?.playbackState);

      if (currentStatus?.playbackState === 'PLAYING') {
        // Playback resumed, don't autoplay
        console.log('Playback resumed, skipping autoplay');
        this.isCheckingForNext = false;
        return;
      }

      // If repeat is enabled, replay the current media
      if (this.repeatEnabled && this.media) {
        console.log('Repeat enabled: replaying current media:', this.media.title);
        await this.playerService.playMedia(this.media, true);
        this.playing = true;
        this.isCheckingForNext = false;
        return;
      }

      // Otherwise check if we have a next item in queue (autoplay mode)
      console.log(
        'Has next?',
        this.autoplayService.hasNext(),
        'Queue length:',
        this.autoplayService.getCurrentQueue().length
      );

      if (this.autoplayService.hasNext()) {
        const nextMedia = this.autoplayService.getNextMedia();

        if (nextMedia) {
          console.log('Autoplaying next item:', nextMedia.title, 'Type:', nextMedia.contentType);

          // Update current media
          this.media = nextMedia;

          // Update artwork
          this.artworkService.getArtwork(this.media).subscribe(url => {
            this.cover = url;
          });

          // Play next media (with autoplay flag to prevent sleep timer reset)
          await this.playerService.playMedia(nextMedia, true);
          this.playing = true;

          // Store as last played
          localStorage.setItem('lastPlayedMedia', JSON.stringify(nextMedia));
        }
      } else {
        console.log('No more items in autoplay queue');
      }
    } catch (error) {
      console.error('Error during autoplay:', error);
    } finally {
      this.isCheckingForNext = false;
    }
  }

  stopStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }

  private startScheduleCheck() {
    this.checkScheduleNow();
    this.scheduleCheckInterval = setInterval(() => this.checkScheduleNow(), 60000);
  }

  private stopScheduleCheck() {
    if (this.scheduleCheckInterval) {
      clearInterval(this.scheduleCheckInterval);
    }
  }

  private checkScheduleNow() {
    if (!this.media?.category) return;

    const clientId = this.clientService.getClientId();
    this.http
      .get<any>(`${environment.apiUrl}/schedules/available`, { params: { clientId } })
      .subscribe(result => {
        const blocked = result.blocked || [];
        if (blocked.includes(this.media.category)) {
          // Stop playback, clear queue and go back to home
          this.playerService.clearQueue();
          this.playerService.sendCmd(PlayerCmds.PAUSE);
          this.stopStatusPolling();
          this.router.navigate(['/home']);
        }
      });
  }

  loadAvailableSpeakers() {
    // Load speaker selection setting for current client from server
    const clientId = this.clientService.getClientId();
    const configUrl = environment.production
      ? '../api/config/client'
      : 'http://localhost:8200/api/config/client';

    this.http
      .get<any>(configUrl, {
        params: { clientId: clientId },
      })
      .subscribe(config => {
        this.enableSpeakerSelection = config.enableSpeakerSelection !== false;

        if (!this.enableSpeakerSelection) return;

        const configData = localStorage.getItem('sonosConfig');

        if (configData) {
          const sonosConfig = JSON.parse(configData);
          this.availableSpeakers = sonosConfig.rooms || [];
          this.setSelectedSpeaker();
        } else {
          // Load speakers from server if not in localStorage
          const speakersUrl = environment.production
            ? '../api/speakers'
            : 'http://localhost:8200/api/speakers';
          this.http.get<any[]>(speakersUrl).subscribe({
            next: speakers => {
              this.availableSpeakers = speakers.map(
                s => s.roomName || s.coordinator?.roomName || 'Unknown Speaker'
              );
              this.setSelectedSpeaker();
            },
            error: () => {
              this.availableSpeakers = [];
            },
          });
        }
      });
  }

  private setSelectedSpeaker() {
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

    console.log(
      'Current selected speaker:',
      this.selectedSpeaker,
      '(temp:',
      tempSpeaker,
      'default:',
      defaultSpeaker,
      ')'
    );
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
      if (
        this.media &&
        this.media.title &&
        this.media.title !== 'undefined' &&
        this.media.artist &&
        this.media.artist !== 'undefined' &&
        this.media.type &&
        this.media.type !== 'undefined'
      ) {
        window.setTimeout(() => {
          console.log(
            'Starting playback on new speaker:',
            this.selectedSpeaker,
            'with media:',
            this.media
          );
          this.playerService.playMedia(this.media);
        }, 1500);
      } else {
        console.log('No valid media to play on new speaker, skipping playback. Media:', this.media);
      }
    });
  }

  private extractSpotifyId(track: any): string | undefined {
    // Try to extract Spotify ID from current track URI or trackUri
    const uri = track.uri || track.trackUri || '';
    console.log('Extracting ID from URI:', uri);

    // Handle URL-encoded URIs
    const decodedUri = decodeURIComponent(uri);
    console.log('Decoded URI:', decodedUri);

    const match = decodedUri.match(/spotify:track:([a-zA-Z0-9]{22})/);
    const id = match ? match[1] : undefined;
    console.log('Extracted Spotify ID:', id);

    return id;
  }

  toggleAutoplay() {
    // If turning on autoplay, turn off repeat
    if (!this.autoplayEnabled) {
      this.autoplayService.setRepeatEnabled(false);
    }
    this.autoplayService.toggleAutoplay();
  }

  toggleRepeat() {
    // If turning on repeat, turn off autoplay
    if (!this.repeatEnabled) {
      this.autoplayService.setEnabled(false);
    }
    this.autoplayService.toggleRepeat();
  }
}
