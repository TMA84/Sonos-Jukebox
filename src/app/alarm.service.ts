import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Alarm {
  id?: string;
  clientId: string;
  name: string;
  time: string; // HH:mm format
  enabled: boolean;
  days: number[]; // 0=Sunday, 1=Monday, etc. Empty array = one-time
  mediaId?: string; // ID of library item to play
  mediaTitle?: string; // Display name
  volume?: number; // 0-100
  fadeIn?: boolean; // Gradually increase volume
  fadeDuration?: number; // Seconds
}

@Injectable({
  providedIn: 'root',
})
export class AlarmService {
  constructor(private http: HttpClient) {}

  getAlarms(clientId: string): Observable<Alarm[]> {
    return this.http.get<Alarm[]>(`${environment.apiUrl}/alarms`, {
      params: { clientId },
    });
  }

  createAlarm(alarm: Alarm): Observable<Alarm> {
    return this.http.post<Alarm>(`${environment.apiUrl}/alarms`, alarm);
  }

  updateAlarm(alarm: Alarm): Observable<Alarm> {
    return this.http.put<Alarm>(`${environment.apiUrl}/alarms/${alarm.id}`, alarm);
  }

  deleteAlarm(alarmId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/alarms/${alarmId}`);
  }

  toggleAlarm(alarmId: string, enabled: boolean): Observable<Alarm> {
    return this.http.patch<Alarm>(`${environment.apiUrl}/alarms/${alarmId}`, { enabled });
  }
}
