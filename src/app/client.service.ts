import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private clientId: string;
  private clientNameCache: string | null = null;

  constructor(private http: HttpClient) {
    // Check URL parameter first (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const clientNameFromUrl = urlParams.get('client');

    if (clientNameFromUrl) {
      // URL parameter takes precedence - load that client
      this.clientId = 'temp-' + Date.now(); // Temporary ID until we load the real one
      this.loadClientByName(clientNameFromUrl);
    } else {
      // No URL parameter, use normal flow
      this.clientId = this.generateClientId();
      this.checkDefaultClient();
    }
  }

  private checkDefaultClient(): void {
    // Check if default client is set via window object (injected by HA addon)
    const defaultClient = (window as any).DEFAULT_CLIENT;
    if (defaultClient && !this.getCookie('sonos-client-id')) {
      // Only use default client if no client is already set
      this.loadClientByName(defaultClient);
    }
  }

  private loadClientByName(clientName: string): void {
    // Check if client exists on server first
    const clientsUrl = `${environment.apiUrl}/clients`;
    fetch(clientsUrl)
      .then(response => response.json())
      .then(clients => {
        const existingClient = clients.find(c => c.name === clientName);
        if (existingClient) {
          this.setClientId(existingClient.id);
        }
      })
      .catch(err => console.log('Could not load clients:', err));
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getClientId(): string {
    // Auto-renew cookie on each access
    this.setCookie('sonos-client-id', this.clientId, 365);
    return this.clientId;
  }

  setClientId(clientId: string): void {
    this.clientId = clientId;
    this.clientNameCache = null; // Clear cache when client changes
    this.setCookie('sonos-client-id', clientId, 365);
  }

  getClientName(): Observable<string> {
    if (this.clientNameCache) {
      return of(this.clientNameCache);
    }

    const configUrl = `${environment.apiUrl}/config/client`;
    return this.http
      .get<any>(configUrl, {
        params: { clientId: this.clientId },
      })
      .pipe(
        map(config => {
          this.clientNameCache = config.name || '';
          return this.clientNameCache;
        }),
        catchError(error => {
          // If client not found (404), try to use default client
          if (error.status === 404) {
            console.log('Client not found, attempting to use default client');
            this.setClientId('client-default');
            // Try again with default client
            return this.http
              .get<any>(configUrl, {
                params: { clientId: 'client-default' },
              })
              .pipe(
                map(config => {
                  this.clientNameCache = config.name || '';
                  return this.clientNameCache;
                }),
                catchError(() => of(''))
              );
          }
          return of('');
        })
      );
  }

  getClientDisplayName(): Observable<string> {
    return this.getClientName().pipe(
      map(name => {
        if (name && name.trim()) {
          return name;
        }
        // Fallback to formatted client ID
        return `Client ${this.clientId.replace('client-', '').replace('client_', '')}`;
      })
    );
  }

  private generateClientId(): string {
    const stored = this.getCookie('sonos-client-id');
    if (stored) return stored;

    const id = 'client-' + Math.random().toString(36).substr(2, 9);
    this.setCookie('sonos-client-id', id, 365);
    return id;
  }

  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || '';
    }
    return '';
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }
}
