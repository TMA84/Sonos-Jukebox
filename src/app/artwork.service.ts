import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Media } from './media';
import { SpotifyService } from './spotify.service';

@Injectable({
  providedIn: 'root'
})
export class ArtworkService {
  private artworkCache = new Map<string, string>();

  constructor(
      private spotifyService: SpotifyService
  ) { }

  getArtwork(media: Media): Observable<string> {
    const cacheKey = `${media.artist}-${media.title}`;
    
    if (this.artworkCache.has(cacheKey)) {
      return of(this.artworkCache.get(cacheKey));
    }

    let artwork: Observable<string>;

    if (media.type === 'spotify' && !media.cover) {
      artwork = this.spotifyService.getAlbumArtwork(media.artist, media.title);
    } else {
      artwork = of(media.cover || '../assets/images/nocover.png');
    }

    return artwork.pipe(
      map(url => {
        this.artworkCache.set(cacheKey, url);
        return url;
      })
    );
  }

  getBatchArtwork(mediaList: Media[]): Observable<{[key: string]: string}> {
    const requests = mediaList.map(media => 
      this.getArtwork(media).pipe(
        map(url => ({ key: media.title, url }))
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const covers = {};
        results.forEach(result => {
          covers[result.key] = result.url;
        });
        return covers;
      })
    );
  }
}
