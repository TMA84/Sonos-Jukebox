import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Client,
  ClientSettings,
  MediaItem,
  Alarm,
  Schedule,
  PlaybackState,
  SonosSpeaker,
  SpotifySearchResult,
  TuneInStation,
  HealthStatus,
  TokenResponse,
  MediaCategory,
} from '@sonos-jukebox/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  login(pin: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/auth/login`, { pin });
  }

  verifyToken(): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>(`${this.base}/auth/verify`);
  }

  changePin(currentPin: string, newPin: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-pin`, { currentPin, newPin });
  }

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.base}/clients`);
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.base}/clients/${id}`);
  }

  createClient(dto: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(`${this.base}/clients`, dto);
  }

  updateClient(id: string, dto: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.base}/clients/${id}`, dto);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/clients/${id}`);
  }

  getClientSettings(id: string): Observable<ClientSettings> {
    return this.http.get<ClientSettings>(`${this.base}/clients/${id}/settings`);
  }

  updateClientSettings(id: string, dto: Partial<ClientSettings>): Observable<ClientSettings> {
    return this.http.put<ClientSettings>(`${this.base}/clients/${id}/settings`, dto);
  }

  getMedia(clientId: string, category?: MediaCategory): Observable<MediaItem[]> {
    const params: Record<string, string> = { clientId };
    if (category) params['category'] = category;
    return this.http.get<MediaItem[]>(`${this.base}/media`, { params });
  }

  createMedia(dto: Partial<MediaItem>): Observable<MediaItem> {
    return this.http.post<MediaItem>(`${this.base}/media`, dto);
  }

  updateMedia(id: string, clientId: string, dto: Partial<MediaItem>): Observable<MediaItem> {
    return this.http.put<MediaItem>(`${this.base}/media/${id}`, dto, { params: { clientId } });
  }

  deleteMedia(id: string, clientId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/media/${id}`, { params: { clientId } });
  }

  getSpeakers(): Observable<SonosSpeaker[]> {
    return this.http.get<SonosSpeaker[]>(`${this.base}/sonos/speakers`);
  }

  getSonosState(room: string): Observable<PlaybackState> {
    return this.http.get<PlaybackState>(`${this.base}/sonos/state`, { params: { room } });
  }

  play(dto: { room: string; uri?: string; metadata?: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/play`, dto);
  }

  pause(dto: { room: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/pause`, dto);
  }

  stop(dto: { room: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/stop`, dto);
  }

  next(dto: { room: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/next`, dto);
  }

  previous(dto: { room: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/previous`, dto);
  }

  setVolume(dto: { room: string; volume: number }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/volume`, dto);
  }

  seek(dto: { room: string; seconds: number }): Observable<void> {
    return this.http.post<void>(`${this.base}/sonos/seek`, dto);
  }

  spotifySearch(query: string, types: string[]): Observable<SpotifySearchResult> {
    return this.http.get<SpotifySearchResult>(`${this.base}/spotify/search`, {
      params: { query, types: types.join(',') },
    });
  }

  getArtistAlbums(
    artistId: string,
    offset?: number,
    limit?: number,
  ): Observable<{ items: SpotifySearchResult[] }> {
    const params: Record<string, string> = {};
    if (offset !== undefined) params['offset'] = String(offset);
    if (limit !== undefined) params['limit'] = String(limit);
    return this.http.get<{ items: SpotifySearchResult[] }>(
      `${this.base}/spotify/artists/${artistId}/albums`,
      { params },
    );
  }

  getShowEpisodes(
    showId: string,
    offset?: number,
    limit?: number,
  ): Observable<{ items: SpotifySearchResult[] }> {
    const params: Record<string, string> = {};
    if (offset !== undefined) params['offset'] = String(offset);
    if (limit !== undefined) params['limit'] = String(limit);
    return this.http.get<{ items: SpotifySearchResult[] }>(
      `${this.base}/spotify/shows/${showId}/episodes`,
      { params },
    );
  }

  getAudiobookChapters(audiobookId: string): Observable<{ items: SpotifySearchResult[] }> {
    return this.http.get<{ items: SpotifySearchResult[] }>(
      `${this.base}/spotify/audiobooks/${audiobookId}/chapters`,
    );
  }

  tuneInSearch(query: string): Observable<TuneInStation[]> {
    return this.http.get<TuneInStation[]>(`${this.base}/tunein/search`, { params: { query } });
  }

  getTuneInStreamUri(stationId: string): Observable<{ uri: string }> {
    return this.http.get<{ uri: string }>(`${this.base}/tunein/stream/${stationId}`);
  }

  getAlarms(clientId: string): Observable<Alarm[]> {
    return this.http.get<Alarm[]>(`${this.base}/alarms`, { params: { clientId } });
  }

  getActiveAlarm(clientId: string): Observable<Alarm | null> {
    return this.http.get<Alarm | null>(`${this.base}/alarms/active`, { params: { clientId } });
  }

  createAlarm(dto: Partial<Alarm>): Observable<Alarm> {
    return this.http.post<Alarm>(`${this.base}/alarms`, dto);
  }

  updateAlarm(id: string, dto: Partial<Alarm>): Observable<Alarm> {
    return this.http.put<Alarm>(`${this.base}/alarms/${id}`, dto);
  }

  deleteAlarm(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/alarms/${id}`);
  }

  stopAlarm(dto: { clientId: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/alarms/stop`, dto);
  }

  snoozeAlarm(dto: { clientId: string; minutes: number }): Observable<void> {
    return this.http.post<void>(`${this.base}/alarms/snooze`, dto);
  }

  getSchedules(clientId: string): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.base}/schedules`, { params: { clientId } });
  }

  getBlockedCategories(clientId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/schedules/blocked`, { params: { clientId } });
  }

  createSchedule(dto: Partial<Schedule>): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.base}/schedules`, dto);
  }

  updateSchedule(id: string, dto: Partial<Schedule>): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/schedules/${id}`, dto);
  }

  deleteSchedule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/schedules/${id}`);
  }

  getAutoplaySettings(clientId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/autoplay/settings`, {
      params: { clientId },
    });
  }

  updateAutoplaySettings(
    clientId: string,
    dto: Record<string, unknown>,
  ): Observable<Record<string, unknown>> {
    return this.http.put<Record<string, unknown>>(`${this.base}/autoplay/settings`, {
      ...dto,
      clientId,
    });
  }

  getAutoplayQueue(clientId: string): Observable<MediaItem[]> {
    return this.http.get<MediaItem[]>(`${this.base}/autoplay/queue`, { params: { clientId } });
  }

  playNextAutoplay(clientId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/autoplay/next`, { clientId });
  }

  getSleepTimer(clientId: string): Observable<{ active: boolean; remainingSeconds?: number }> {
    return this.http.get<{ active: boolean; remainingSeconds?: number }>(
      `${this.base}/sleep-timer`,
      { params: { clientId } },
    );
  }

  startSleepTimer(
    clientId: string,
    dto: { minutes: number; room: string },
  ): Observable<void> {
    return this.http.post<void>(`${this.base}/sleep-timer/start`, { clientId, ...dto });
  }

  stopSleepTimer(clientId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/sleep-timer/stop`, { clientId });
  }

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.base}/health`);
  }
}
