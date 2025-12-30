import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';
import { SonosApiConfig } from './sonos-api';
import { ClientService } from './client.service';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { publishReplay, refCount, map } from 'rxjs/operators';

export enum PlayerCmds {
  PLAY = 'play',
  PAUSE = 'pause',
  PLAYPAUSE = 'playpause',
  PREVIOUS = 'previous',
  NEXT = 'next',
  VOLUMEUP = 'volume/+5',
  VOLUMEDOWN = 'volume/-5',
  CLEARQUEUE = 'clearqueue'
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  private config: Observable<SonosApiConfig> = null;
  private sleepTimer: any = null;

  constructor(
    private http: HttpClient,
    private clientService: ClientService
  ) {}

  getConfig() {
    // Observable with caching:
    // publishReplay(1) tells rxjs to cache the last response of the request
    // refCount() keeps the observable alive until all subscribers unsubscribed
    if (!this.config) {
      const url = (environment.production) ? '../api/sonos' : 'http://localhost:8200/api/sonos';

      this.config = this.http.get<SonosApiConfig>(url, {
        params: { clientId: this.clientService.getClientId() }
      }).pipe(
        publishReplay(1), // cache result
        refCount()
      );
    }

    return this.config;
  }

  getState() {
    this.sendRequest('state');
  }

  private async getClientRoom(): Promise<string> {
    const clientId = this.clientService.getClientId();
    if (!clientId) {
      return 'Living Room';
    }

    try {
      const configUrl = environment.production ? '../api/config/client' : 'http://localhost:8200/api/config/client';
      const config = await this.http.get<any>(configUrl, { 
        params: { clientId } 
      }).toPromise();
      
      // If speaker selection is disabled, use client's configured room
      if (!config.enableSpeakerSelection && config.room) {
        return config.room;
      }
      
      // If speaker selection is enabled, use temporary or stored selection
      const tempSpeaker = sessionStorage.getItem('tempSelectedSpeaker');
      const defaultSpeaker = localStorage.getItem('selectedSpeaker');
      return tempSpeaker || defaultSpeaker || config.room || 'Living Room';
    } catch (error) {
      console.error('Failed to get client config:', error);
      const tempSpeaker = sessionStorage.getItem('tempSelectedSpeaker');
      const defaultSpeaker = localStorage.getItem('selectedSpeaker');
      return tempSpeaker || defaultSpeaker || 'Living Room';
    }
  }

  async sendCmd(cmd: PlayerCmds) {
    const room = await this.getClientRoom();
    
    switch (cmd) {
      case PlayerCmds.PLAY:
        this.http.post(environment.production ? '../api/sonos/play' : 'http://localhost:8200/api/sonos/play', { room }).subscribe({
          next: () => {
            console.log('Play command sent');
            this.startSleepTimer();
          },
          error: (error) => console.error('Failed to send play command:', error)
        });
        break;
      case PlayerCmds.PAUSE:
        this.http.post(environment.production ? '../api/sonos/pause' : 'http://localhost:8200/api/sonos/pause', { room }).subscribe({
          next: () => console.log('Pause command sent'),
          error: (error) => console.error('Failed to send pause command:', error)
        });
        break;
      case PlayerCmds.NEXT:
        this.http.post(environment.production ? '../api/sonos/next' : 'http://localhost:8200/api/sonos/next', { room }).subscribe({
          next: () => console.log('Next command sent'),
          error: (error) => console.error('Failed to send next command:', error)
        });
        break;
      case PlayerCmds.PREVIOUS:
        this.http.post(environment.production ? '../api/sonos/previous' : 'http://localhost:8200/api/sonos/previous', { room }).subscribe({
          next: () => console.log('Previous command sent'),
          error: (error) => console.error('Failed to send previous command:', error)
        });
        break;
      case PlayerCmds.VOLUMEUP:
        this.http.post(environment.production ? '../api/sonos/volume' : 'http://localhost:8200/api/sonos/volume', { room, change: '+5' }).subscribe({
          next: () => console.log('Volume up command sent'),
          error: (error) => console.error('Failed to send volume up command:', error)
        });
        break;
      case PlayerCmds.VOLUMEDOWN:
        this.http.post(environment.production ? '../api/sonos/volume' : 'http://localhost:8200/api/sonos/volume', { room, change: '-5' }).subscribe({
          next: () => console.log('Volume down command sent'),
          error: (error) => console.error('Failed to send volume down command:', error)
        });
        break;
      default:
        console.warn('Command not yet supported:', cmd);
    }
  }

  async playMedia(media: Media) {
    // Validate media before processing
    if (!media || !media.title || !media.artist) {
      console.error('Invalid media provided to playMedia:', media);
      return;
    }
    
    let uri: string;

    switch (media.type) {
      case 'spotify': {
        if (media.category === 'playlist') {
          uri = 'spotify:user:spotify:playlist:' + media.id;
        } else {
          if (media.id) {
            // If media has contentType 'track' or was created from current track, use track URI
            // Otherwise use album URI for library albums
            if (media.contentType === 'track' || !media.contentType) {
              uri = 'spotify:track:' + media.id;
            } else {
              uri = 'spotify:album:' + media.id;
            }
          } else {
            // For search-based media without ID, we'll need to search first
            console.warn('Playing media without Spotify ID not yet supported');
            return;
          }
        }
        break;
      }
      case 'tunein': {
        // For TuneIn radio, get streamUrl from metadata
        let metadata;
        try {
          metadata = typeof (media as any).metadata === 'string' ? JSON.parse((media as any).metadata) : (media as any).metadata;
        } catch (e) {
          console.error('Failed to parse radio metadata:', e);
          return;
        }
        
        if (metadata?.streamUrl) {
          uri = metadata.streamUrl;
        } else {
          console.error('No streamUrl found for radio station:', media);
          return;
        }
        break;
      }
      default:
        console.warn('Media type not yet supported:', media.type);
        return;
    }

    // Get client's room and play
    const playUrl = environment.production ? '../api/sonos/play' : 'http://localhost:8200/api/sonos/play';
    const room = await this.getClientRoom();
    
    this.http.post(playUrl, { room, uri }).subscribe({
      next: (response) => {
        console.log('Successfully started playback:', response);
        this.startSleepTimer();
      },
      error: (error) => {
          console.error('Failed to play media:', error);
        }
      });
  }

  say(text: string) {
    // Skip TTS for empty or invalid text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return;
    }

    this.getConfig().subscribe(config => {
      try {
        let url = 'say/' + encodeURIComponent(text.trim()) + '/' + ((config.tts?.language?.length > 0) ? config.tts.language : 'de-de');

        if (config.tts?.volume?.length > 0) {
          url += '/' + config.tts.volume;
        }

        this.sendRequest(url).catch(error => {
          console.error('Failed to say text:', error);
        });
      } catch (error) {
        console.error('Failed to construct TTS URL for text:', text, error);
      }
    });
  }

  getCurrentTrack(): Observable<any> {
    const url = environment.production ? '../api/sonos' : 'http://localhost:8200/api/sonos';
    
    return new Observable(observer => {
      this.getClientRoom().then(room => {
        const params: any = { clientId: this.clientService.getClientId() };
        if (room) {
          params.room = room;
        }
        
        this.http.get<any>(url, { params }).pipe(
          map((state: any) => ({
            title: state.currentTrack?.title || 'Unknown',
            artist: state.currentTrack?.artist || 'Unknown Artist',
            album: state.currentTrack?.album || '',
            playbackState: state.playbackState,
            uri: state.currentTrack?.uri,
            trackUri: state.currentTrack?.trackUri
          }))
        ).subscribe(observer);
      }).catch(error => {
        console.error('Failed to get client room:', error);
        observer.error(error);
      });
    });
  }

  private startSleepTimer() {
    // Clear any existing timer
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
    }

    // Get client's sleep timer setting
    const configUrl = environment.production ? '../api/config' : 'http://localhost:8200/api/config';
    this.http.get<any>(configUrl, {
      params: { clientId: this.clientService.getClientId() }
    }).subscribe(config => {
      const sleepMinutes = config.sleepTimer || 0;
      
      if (sleepMinutes > 0) {
        console.log(`Sleep timer set for ${sleepMinutes} minutes`);
        this.sleepTimer = setTimeout(() => {
          this.pausePlayback();
          console.log('Sleep timer expired - pausing playback');
        }, sleepMinutes * 60 * 1000);
      }
    });
  }

  private async pausePlayback() {
    const pauseUrl = environment.production ? '../api/sonos/pause' : 'http://localhost:8200/api/sonos/pause';
    const room = await this.getClientRoom();
    
    this.http.post(pauseUrl, { room }).subscribe({
      next: () => console.log('Playback paused by sleep timer'),
      error: (error) => console.error('Failed to pause playback:', error)
    });
  }

  switchSpeaker(speakerName: string): Promise<void> {
    return new Promise((resolve) => {
      // Clear the cached config to force reload with new speaker
      this.config = null;
      // Store temporary speaker selection (cleared on page reload)
      sessionStorage.setItem('tempSelectedSpeaker', speakerName);
      resolve();
    });
  }

  stopSpeaker(speakerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const pauseUrl = environment.production ? '../api/sonos/pause' : 'http://localhost:8200/api/sonos/pause';
      
      this.http.post(pauseUrl, { room: speakerName }).subscribe({
        next: (response) => {
          console.log('Successfully stopped speaker:', speakerName, response);
          resolve();
        },
        error: (err) => {
          console.error('Failed to stop speaker:', speakerName, 'Error:', err);
          resolve(); // Resolve anyway to not block speaker switching
        }
      });
    });
  }

  private sendRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getConfig().subscribe(config => {
        // Use temporary speaker selection if available, otherwise use client default
        const tempSpeaker = sessionStorage.getItem('tempSelectedSpeaker');
        const defaultSpeaker = localStorage.getItem('selectedSpeaker');
        const selectedSpeaker = tempSpeaker || defaultSpeaker || config.rooms[0];
        
        const baseUrl = 'http://' + config.server + ':' + config.port + '/' + encodeURIComponent(selectedSpeaker) + '/';
        this.http.get(baseUrl + url).subscribe({
          next: (response) => {
            resolve(response);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    });
  }
}
