import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  constructor(private http: HttpClient) {
  }

  getMediaByQuery(query: string, category: string): Observable<Media[]> {
    const searchUrl = environment.production ? '../api/spotify/search/albums' : 'http://localhost:8200/api/spotify/search/albums';
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '50' }
    }).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }

  getMediaByArtistID(id: string, category: string): Observable<Media[]> {
    const artistUrl = environment.production ? `../api/spotify/artists/${id}/albums` : `http://localhost:8200/api/spotify/artists/${id}/albums`;
    
    return this.http.get<any>(artistUrl, { 
      params: { limit: '50' }
    }).pipe(
      map((response: any) => {
        return response.items.map(item => {
          const media: Media = {
            id: item.id,
            artist: item.artists[0].name,
            title: item.name,
            cover: item.images[0]?.url,
            type: 'spotify',
            category
          };
          return media;
        });
      })
    );
  }

  getMediaByID(id: string, category: string): Observable<Media> {
    const albumUrl = environment.production ? `../api/spotify/albums/${id}` : `http://localhost:8200/api/spotify/albums/${id}`;
    
    return this.http.get<any>(albumUrl).pipe(
      map((response: any) => {
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
  }

  getAlbumArtwork(artist: string, title: string): Observable<string> {
    const searchUrl = environment.production ? '../api/spotify/search/albums' : 'http://localhost:8200/api/spotify/search/albums';
    const query = `album:${title} artist:${artist}`;
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '1' }
    }).pipe(
      map((response: any) => {
        return response?.items?.[0]?.images?.[0]?.url || '';
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
    const searchUrl = environment.production ? '../api/spotify/search/tracks' : 'http://localhost:8200/api/spotify/search/tracks';
    
    return this.http.get<any>(searchUrl, { 
      params: { q: query, limit: '20' }
    }).pipe(
      map((response: any) => {
        return response.items.map(item => {
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
}
