import { Injectable } from '@angular/core';
import { Observable, defer, throwError, of, range } from 'rxjs';
import { retryWhen, flatMap, tap, delay, take, map, mergeMap, mergeAll, toArray } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { SpotifyAlbumsResponse, SpotifyAlbumsResponseItem, SpotifyArtistsAlbumsResponse } from './spotify';
import { Media } from './media';

declare const require: any;

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  spotifyApi: any;
  refreshingToken = false;

  constructor(private http: HttpClient) {
    const SpotifyWebApi = require('../../src/app/spotify-web-api.js');
    this.spotifyApi = new SpotifyWebApi();
  }

  getMediaByQuery(query: string, category: string): Observable<Media[]> {
    const albums = defer(() => this.spotifyApi.searchAlbums(query, { limit: 1, offset: 0, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyAlbumsResponse) => response.albums.total),
      mergeMap(count => range(0, Math.ceil(count / 50))),
      mergeMap(multiplier => defer(() => this.spotifyApi.searchAlbums(query, { limit: 50, offset: 50 * multiplier, market: 'DE' })).pipe(
        retryWhen(errors => {
          return this.errorHandler(errors);
        }),
        map((response: SpotifyAlbumsResponse) => {
          return response.albums.items.map(item => {
            const media: Media = {
              id: item.id,
              artist: item.artists[0].name,
              title: item.name,
              cover: item.images[0].url,
              type: 'spotify',
              category
            };
            return media;
          });
        })
      )),
      mergeAll(),
      toArray()
    );

    return albums;
  }

  getMediaByArtistID(id: string, category: string): Observable<Media[]> {
    const albums = defer(() => this.spotifyApi.getArtistAlbums(id, { include_groups: 'album', limit: 1, offset: 0, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyArtistsAlbumsResponse) => response.total),
      mergeMap(count => range(0, Math.ceil(count / 50))),
      mergeMap(multiplier => defer(() => this.spotifyApi.getArtistAlbums(id, { include_groups: 'album', limit: 50, offset: 50 * multiplier, market: 'DE' })).pipe(
        retryWhen(errors => {
          return this.errorHandler(errors);
        }),
        map((response: SpotifyArtistsAlbumsResponse) => {
          return response.items.map(item => {
            const media: Media = {
              id: item.id,
              artist: item.artists[0].name,
              title: item.name,
              cover: item.images[0].url,
              type: 'spotify',
              category
            };
            return media;
          });
        })
      )),
      mergeAll(),
      toArray()
    );

    return albums;
  }

  getMediaByID(id: string, category: string): Observable<Media> {
    let fetch: any;

    switch (category) {
      case 'playlist':
        fetch = this.spotifyApi.getPlaylist;
        break;
      default:
        fetch = this.spotifyApi.getAlbum;
    }

    const album = defer(() => fetch(id, { limit: 1, offset: 0, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyAlbumsResponseItem) => {
        const media: Media = {
          id: response.id,
          artist: response.artists?.[0]?.name,
          title: response.name,
          cover: response?.images[0]?.url,
          type: 'spotify',
          category
        };
        return media;
      })
    );

    return album;
  }

  // Only used for single "artist + title" entries with "type: spotify" in the database.
  // Artwork for spotify search queries are already fetched together with the initial searchAlbums request
  getAlbumArtwork(artist: string, title: string): Observable<string> {
    const artwork = defer(() => this.spotifyApi.searchAlbums('album:' + title + ' artist:' + artist, { market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyAlbumsResponse) => {
        return response?.albums?.items?.[0]?.images?.[0]?.url || '';
      })
    );

    return artwork;
  }

  refreshToken() {
    const tokenUrl = (environment.production) ? '../api/token' : 'http://localhost:8200/api/token';

    this.http.get(tokenUrl, {responseType: 'text'}).subscribe(token => {
      this.spotifyApi.setAccessToken(token);
      this.refreshingToken = false;
    });
  }

  searchAlbums(query: string): Observable<Media[]> {
    return defer(() => this.spotifyApi.searchAlbums(query, { limit: 20, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyAlbumsResponse) => {
        return response.albums.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category: 'audiobook'
          };
          return media;
        });
      })
    );
  }

  searchArtists(query: string): Observable<any[]> {
    return defer(() => this.spotifyApi.searchArtists(query, { limit: 20 })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: any) => {
        return response.artists.items.map(item => ({
          id: item.id,
          name: item.name,
          image: item.images[0]?.url,
          followers: item.followers.total
        }));
      })
    );
  }

  errorHandler(errors: Observable<any>) {
    let retryCount = 0;
    return errors.pipe(
      flatMap((error) => {
        if (error.status === 429) {
          // Rate limited - Spotify has hidden 30+ second rate limit
          const delayTime = retryCount === 0 ? 35000 : Math.min(35000 * Math.pow(2, retryCount - 1), 120000); // Start with 35s, max 2min
          retryCount++;
          console.log(`Rate limited, waiting ${delayTime/1000}s before retry ${retryCount}`);
          return of(error).pipe(delay(delayTime));
        } else if (error.status === 401) {
          // Token expired
          if (!this.refreshingToken) {
            this.refreshToken();
            this.refreshingToken = true;
          }
          return of(error).pipe(delay(1000));
        } else {
          return throwError(error);
        }
      }),
      take(3) // Reduce retry attempts further
    );
  }
}
