import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private api = inject(ApiService);

  getConfig(): Observable<any> {
    return this.api.get('config');
  }

  getSonosConfig(): Observable<any> {
    return this.api.get('config/sonos');
  }

  saveSonosConfig(host: string, port: string): Observable<any> {
    return this.api.post('config/sonos', { host, port });
  }
}
