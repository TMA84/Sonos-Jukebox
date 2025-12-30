import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TuneInStation {
  id: string;
  name: string;
  description: string;
  image: string;
  genre: string;
  bitrate: string;
  reliability: string;
  streamUrl: string;
}

export interface TuneInSearchResponse {
  stations: {
    items: TuneInStation[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TuneInService {
  private baseUrl = '/api/tunein';

  constructor(private http: HttpClient) {}

  searchStations(query: string, limit: number = 20): Observable<TuneInSearchResponse> {
    return this.http.get<TuneInSearchResponse>(`${this.baseUrl}/search/stations`, {
      params: { q: query, limit: limit.toString() }
    });
  }
}
