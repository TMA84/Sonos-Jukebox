import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private clientId: string;

  constructor() {
    this.clientId = this.generateClientId();
    this.checkUrlForClient();
  }

  private checkUrlForClient(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const clientName = urlParams.get('client');
    if (clientName) {
      this.loadClientByName(clientName);
    }
  }

  private loadClientByName(clientName: string): void {
    // Check if client exists on server first
    const clientsUrl = window.location.origin + '/api/clients';
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
      hash = ((hash << 5) - hash) + char;
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
    this.setCookie('sonos-client-id', clientId, 365);
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
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }
}