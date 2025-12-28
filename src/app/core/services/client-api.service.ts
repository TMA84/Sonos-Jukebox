import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Client } from '../../shared/models/client.model';

@Injectable({
  providedIn: 'root',
})
export class ClientApiService {
  private api = inject(ApiService);

  getClients(): Observable<Client[]> {
    return this.api.get<Client[]>('clients');
  }

  getClient(id: string): Observable<Client> {
    return this.api.get<Client>(`clients/${id}`);
  }

  createClient(id: string, name: string): Observable<Client> {
    return this.api.post<Client>('clients', { id, name });
  }

  updateClient(id: string, updates: Partial<Client>): Observable<Client> {
    return this.api.put<Client>(`clients/${id}`, updates);
  }

  deleteClient(id: string): Observable<void> {
    return this.api.delete<void>(`clients/${id}`);
  }

  updateSpeaker(id: string, room: string): Observable<Client> {
    return this.api.post<Client>(`clients/${id}/speaker`, { room });
  }
}
