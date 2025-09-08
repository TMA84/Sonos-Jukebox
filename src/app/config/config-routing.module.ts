import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ConfigPage } from './config.page';
import { PinGuard } from '../guards/pin.guard';

const routes: Routes = [
  {
    path: '',
    component: ConfigPage,
    canActivate: [PinGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigPageRoutingModule {}