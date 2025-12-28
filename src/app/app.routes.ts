import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'config',
    loadChildren: () => import('./config/config.module').then(m => m.ConfigPageModule)
  },
  {
    path: 'medialist',
    loadChildren: () => import('./medialist/medialist.module').then(m => m.MedialistPageModule)
  },
  {
    path: 'player',
    loadChildren: () => import('./player/player.module').then(m => m.PlayerPageModule)
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
