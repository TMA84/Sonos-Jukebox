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
    const albums = defer(() => this.spotifyApi.getArtistAlbums(id, { include_groups: 'album,single', limit: 1, offset: 0, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: SpotifyArtistsAlbumsResponse) => response.total),
      mergeMap(count => range(0, Math.ceil(count / 50))),
      mergeMap(multiplier => defer(() => this.spotifyApi.getArtistAlbums(id, { include_groups: 'album,single', limit: 50, offset: 50 * multiplier, market: 'DE' })).pipe(
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

  refreshToken(): Observable<string> {
    const tokenUrl = (environment.production) ? '../api/token' : 'http://localhost:8200/api/token';

    return this.http.get(tokenUrl, {responseType: 'text'}).pipe(
      tap((token) => {
        this.spotifyApi.setAccessToken(token);
        this.refreshingToken = false;
        console.log('Token refreshed successfully');
      })
    );
  }

  searchAlbums(query: string): Observable<Media[]> {
    const searchUrl = environment.production ? '../api/spotify/search/albums' : 'http://localhost:8200/api/spotify/search/albums';
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '20' }
    }).pipe(
      map((response: any) => {
        return response.items.map(item => {
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
    const searchUrl = environment.production ? '../api/spotify/search/artists' : 'http://localhost:8200/api/spotify/search/artists';
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '20' }
    }).pipe(
      map((response: any) => {
        return response.items.map(item => ({
          id: item.id,
          name: item.name,
          image: item.images[0]?.url,
          followers: item.followers.total
        }));
      })
    );
  }

  searchTracks(query: string, category: string): Observable<Media[]> {
    return defer(() => this.spotifyApi.searchTracks(query, { limit: 20, market: 'DE' })).pipe(
      retryWhen(errors => {
        return this.errorHandler(errors);
      }),
      map((response: any) => {
        return response.tracks.items.map(item => {
          const media: Media = {
            id: item.album.id,
            artist: item.artists[0].name,
            title: item.album.name,
            cover: item.album.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }

  errorHandler(errors: Observable<any>) {
    let retryCount = 0;
    return errors.pipe(
      flatMap((error) => {
        if (error.status === 429) {
          // Rate limited - use exponential backoff since retry-after is blocked by CORS
          const delayTime = Math.min(60000 * Math.pow(2, retryCount), 600000); // 1min, 2min, 4min, max 10min
          retryCount++;

          return of(error).pipe(delay(delayTime));
        } else if (error.status === 401) {
          // Token expired - refresh and wait for completion
          console.log('Token expired, refreshing...');
          if (!this.refreshingToken) {
            this.refreshingToken = true;
            return this.refreshToken().pipe(
              delay(1000),
              map(() => error)
            );
          } else {
            return of(error).pipe(delay(3000));
          }
        } else {
          return throwError(error);
        }
      }),
      take(5) // More retries for token refresh
    );
  }
}
