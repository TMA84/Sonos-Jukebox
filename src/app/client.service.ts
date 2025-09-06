import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private clientId: string;

  constructor() {
    this.clientId = this.generateClientId();
  }

  getClientId(): string {
    return this.clientId;
  }

  private generateClientId(): string {
    const stored = localStorage.getItem('sonos-client-id');
    if (stored) return stored;
    
    const id = 'client-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sonos-client-id', id);
    return id;
  }
}