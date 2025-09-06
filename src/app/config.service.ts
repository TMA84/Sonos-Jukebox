import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ClientService } from './client.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any = null;

  constructor(
    private http: HttpClient,
    private clientService: ClientService
  ) {}

  getConfig(): Observable<any> {
    const configUrl = environment.production ? '../api/config' : 'http://localhost:8200/api/config';
    return this.http.get(configUrl, { 
      params: { clientId: this.clientService.getClientId() }
    });
  }

  isSpotifyConfigured(): boolean {
    return this.config?.spotify?.clientId && this.config?.spotify?.clientSecret;
  }

  setConfig(config: any) {
    this.config = config;
  }
}