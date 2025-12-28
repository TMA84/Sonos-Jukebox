import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private tokenKey = 'auth_token';
  isAuthenticated = signal(this.hasToken());

  verifyPin(pin: string, clientId: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/pin/verify', { pin, clientId }).pipe(
      tap(response => {
        this.setToken(response.token);
        this.isAuthenticated.set(true);
      })
    );
  }

  changePin(currentPin: string, newPin: string): Observable<{ message: string }> {
    return this.api.post('auth/pin/change', { currentPin, newPin });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticated.set(false);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}
