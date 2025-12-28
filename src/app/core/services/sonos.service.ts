import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SonosService {
  private http = inject(HttpClient);
  private baseUrl = environment.production ? '/api' : 'http://localhost:8200/api';

  getZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sonos/zones`);
  }
}
