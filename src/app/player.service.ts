import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';
import { SonosApiConfig } from './sonos-api';
import { ClientService } from './client.service';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';

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

  sendCmd(cmd: PlayerCmds) {
    this.sendRequest(cmd).catch(error => {
      console.error('Failed to send command:', error);
    });
  }

  playMedia(media: Media) {
    // Validate media before processing
    if (!media || !media.title || !media.artist) {
      console.error('Invalid media provided to playMedia:', media);
      return;
    }
    
    let url: string;

    switch (media.type) {
      case 'applemusic': {
        if (media.category === 'playlist') {
          url = 'applemusic/now/playlist:' + encodeURIComponent(media.id);
        } else {
          url = 'applemusic/now/album:' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'amazonmusic': {
        if (media.category === 'playlist') {
          url = 'amazonmusic/now/playlist:' + encodeURIComponent(media.id);
        } else {
          url = 'amazonmusic/now/album:' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'library': {
        if (!media.id) {
          media.id = media.title;
        }
        if (media.category === 'playlist') {
          url = 'playlist/' + encodeURIComponent(media.id);
        } else {
          url = 'musicsearch/library/album/' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'spotify': {
        if (media.category === 'playlist') {
          url = 'spotify/now/spotify:user:spotify:playlist:' + encodeURIComponent(media.id);
        } else {
          if (media.id) {
            url = 'spotify/now/spotify:album:' + encodeURIComponent(media.id);
          } else {
            url = 'musicsearch/spotify/album/artist:"' + encodeURIComponent(media.artist) + '" album:"' + encodeURIComponent(media.title) + '"';
          }
        }
        break;
      }
      case 'tunein': {
        url = 'tunein/play/' + encodeURIComponent(media.id);
        break;
      }
    }

    this.sendRequest(url).catch(error => {
      console.error('Failed to play media:', error.error?.error || error.message);
    });
  }

  say(text: string) {
    this.getConfig().subscribe(config => {
      let url = 'say/' + encodeURIComponent(text) + '/' + ((config.tts?.language?.length > 0) ? config.tts.language : 'de-de');

      if (config.tts?.volume?.length > 0) {
        url += '/' + config.tts.volume;
      }

      this.sendRequest(url).catch(error => {
        console.error('Failed to say text:', error);
      });
    });
  }

  getCurrentTrack(): Observable<any> {
    return new Observable(observer => {
      this.getConfig().subscribe(config => {
        const selectedSpeaker = localStorage.getItem('selectedSpeaker') || config.rooms[0];
        const baseUrl = 'http://' + config.server + ':' + config.port + '/' + selectedSpeaker + '/';
        this.http.get(baseUrl + 'state').subscribe(
          (state: any) => {
            observer.next({
              title: state.currentTrack?.title || 'Unknown',
              artist: state.currentTrack?.artist || 'Unknown Artist',
              album: state.currentTrack?.album || '',
              playbackState: state.playbackState
            });
          },
          error => observer.next(null)
        );
      });
    });
  }

  switchSpeaker(speakerName: string): Promise<void> {
    return new Promise((resolve) => {
      // Clear the cached config to force reload with new speaker
      this.config = null;
      localStorage.setItem('selectedSpeaker', speakerName);
      resolve();
    });
  }

  stopSpeaker(speakerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getConfig().subscribe(config => {
        const encodedSpeaker = encodeURIComponent(speakerName);
        const baseUrl = 'http://' + config.server + ':' + config.port + '/' + encodedSpeaker + '/';
        console.log('Stopping speaker with URL:', baseUrl + 'pause');
        
        // Send pause command to stop the speaker
        this.http.get(baseUrl + 'pause').subscribe({
          next: (response) => {
            console.log('Successfully stopped speaker:', speakerName, response);
            resolve();
          },
          error: (err) => {
            console.error('Failed to stop speaker:', speakerName, 'URL:', baseUrl + 'pause', 'Error:', err);
            resolve();
          }
        });
      });
    });
  }

  private sendRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getConfig().subscribe(config => {
        const selectedSpeaker = localStorage.getItem('selectedSpeaker') || config.rooms[0];
        const baseUrl = 'http://' + config.server + ':' + config.port + '/' + selectedSpeaker + '/';
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
