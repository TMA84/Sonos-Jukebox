import { Injectable, inject, signal, computed } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { ClientApiService } from '../services/client-api.service';
import { Client } from '../../shared/models/client.model';

interface ClientState {
  currentClient: Client | null;
  clients: Client[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ClientStore {
  private clientApi = inject(ClientApiService);
  private readonly CLIENT_ID_KEY = 'current_client_id';

  // State signals
  private state = signal<ClientState>({
    currentClient: null,
    clients: [],
    loading: false,
    error: null,
  });

  // Selectors
  currentClient = computed(() => this.state().currentClient);
  clients = computed(() => this.state().clients);
  loading = computed(() => this.state().loading);
  error = computed(() => this.state().error);
  currentClientId = computed(() => this.state().currentClient?.id || 'default');
  currentClientName = computed(() => this.state().currentClient?.name || 'Default');

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const savedClientId = localStorage.getItem(this.CLIENT_ID_KEY);
    if (savedClientId) {
      this.loadClient(savedClientId);
    }
    this.loadClients();
  }

  // Actions
  loadClients() {
    this.state.update(state => ({ ...state, loading: true, error: null }));

    this.clientApi
      .getClients()
      .pipe(
        tap(clients => {
          this.state.update(state => ({
            ...state,
            clients,
            loading: false,
          }));
        }),
        catchError(error => {
          this.state.update(state => ({
            ...state,
            loading: false,
            error: error.message || 'Failed to load clients',
          }));
          return of([]);
        })
      )
      .subscribe();
  }

  loadClient(id: string) {
    this.clientApi
      .getClient(id)
      .pipe(
        tap(client => {
          this.state.update(state => ({ ...state, currentClient: client }));
          localStorage.setItem(this.CLIENT_ID_KEY, id);
        }),
        catchError(error => {
          console.error('Failed to load client:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  setCurrentClient(client: Client) {
    this.state.update(state => ({ ...state, currentClient: client }));
    localStorage.setItem(this.CLIENT_ID_KEY, client.id);
  }

  createClient(id: string, name: string) {
    this.clientApi
      .createClient(id, name)
      .pipe(
        tap(newClient => {
          this.state.update(state => ({
            ...state,
            clients: [...state.clients, newClient],
            currentClient: newClient,
          }));
          localStorage.setItem(this.CLIENT_ID_KEY, newClient.id);
        }),
        catchError(error => {
          console.error('Failed to create client:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  updateClient(id: string, updates: Partial<Client>) {
    this.clientApi
      .updateClient(id, updates)
      .pipe(
        tap(updatedClient => {
          this.state.update(state => ({
            ...state,
            clients: state.clients.map(c => (c.id === id ? updatedClient : c)),
            currentClient:
              state.currentClient?.id === id ? updatedClient : state.currentClient,
          }));
        }),
        catchError(error => {
          console.error('Failed to update client:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  deleteClient(id: string) {
    this.clientApi
      .deleteClient(id)
      .pipe(
        tap(() => {
          this.state.update(state => ({
            ...state,
            clients: state.clients.filter(c => c.id !== id),
          }));
        }),
        catchError(error => {
          console.error('Failed to delete client:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  updateSpeaker(id: string, room: string) {
    this.clientApi
      .updateSpeaker(id, room)
      .pipe(
        tap(updatedClient => {
          this.state.update(state => ({
            ...state,
            currentClient:
              state.currentClient?.id === id ? updatedClient : state.currentClient,
          }));
        }),
        catchError(error => {
          console.error('Failed to update speaker:', error);
          return of(null);
        })
      )
      .subscribe();
  }
}
