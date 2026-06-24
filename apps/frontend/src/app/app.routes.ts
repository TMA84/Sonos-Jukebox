import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { kioskGuard } from './guards/kiosk.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.page') },
  { path: 'player', loadComponent: () => import('./pages/player/player.page') },
  { path: 'alarms', loadComponent: () => import('./pages/alarm-manager/alarm-manager.page') },
  {
    path: 'config',
    loadComponent: () => import('./pages/config/config.page'),
    canActivate: [kioskGuard, authGuard],
  },
];
