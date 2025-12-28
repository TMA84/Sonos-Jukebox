import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Media } from '../../shared/models/media.model';

@Injectable({
  providedIn: 'root',
})
export class MediaApiService {
  private api = inject(ApiService);

  getMedia(clientId: string, category?: string): Observable<Media[]> {
    let params = new HttpParams().set('clientId', clientId);
    if (category) {
      params = params.set('category', category);
    }
    return this.api.get<Media[]>('media', params);
  }

  getMediaById(id: string): Observable<Media> {
    return this.api.get<Media>(`media/${id}`);
  }

  createMedia(media: Partial<Media>): Observable<Media> {
    return this.api.post<Media>('media', media);
  }

  deleteMedia(id: string, clientId: string): Observable<void> {
    const params = new HttpParams().set('clientId', clientId);
    return this.api.delete<void>(`media/${id}`);
  }

  incrementPlayCount(id: string): Observable<void> {
    return this.api.post<void>(`media/${id}/play`, {});
  }

  getPopularMedia(clientId: string, limit = 10): Observable<Media[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.api.get<Media[]>(`media/popular/${clientId}`, params);
  }
}
