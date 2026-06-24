import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Client, ClientSettings } from '@sonos-jukebox/shared';
import { ApiService } from '../services/api.service';
import { KioskService } from '../services/kiosk.service';

const CLIENT_STORAGE_KEY = 'sonos-jukebox-selected-client';

@Injectable({ providedIn: 'root' })
export class ClientStore {
  private readonly api = inject(ApiService);
  private readonly kioskService = inject(KioskService);

  readonly currentClient = signal<Client | null>(null);
  readonly clients = signal<Client[]>([]);
  readonly settings = signal<ClientSettings | null>(null);

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadClients();
    const clientId = this.getStoredClientId() ?? this.getClientIdFromUrl();
    if (clientId) {
      const match = this.clients().find((c) => c.id === clientId || c.name === clientId);
      if (match) {
        await this.switchClient(match.id);
        return;
      }
    }
    const all = this.clients();
    if (all.length > 0) await this.switchClient(all[0].id);
  }

  async loadClients(): Promise<void> {
    const clients = await firstValueFrom(this.api.getClients());
    this.clients.set(clients);
  }

  async switchClient(clientId: string): Promise<void> {
    const [client, settings] = await Promise.all([
      firstValueFrom(this.api.getClient(clientId)),
      firstValueFrom(this.api.getClientSettings(clientId)),
    ]);
    this.currentClient.set(client);
    this.settings.set(settings);
    this.persistClientId(clientId);
    this.kioskService.updateFromSettings(settings);
  }

  async updateSettings(updates: Partial<ClientSettings>): Promise<void> {
    const client = this.currentClient();
    if (!client) return;
    const updated = await firstValueFrom(this.api.updateClientSettings(client.id, updates));
    this.settings.set(updated);
    this.kioskService.updateFromSettings(updated);
  }

  private getClientIdFromUrl(): string | null {
    return new URLSearchParams(window.location.search).get('client');
  }

  private getStoredClientId(): string | null {
    try {
      return localStorage.getItem(CLIENT_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persistClientId(id: string): void {
    try {
      localStorage.setItem(CLIENT_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }
}
