import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedialistPageRoutingModule } from './medialist-routing.module';
import { SharedModule } from '../shared/shared.module';

import { MedialistPage } from './medialist.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedialistPageRoutingModule,
    SharedModule
  ],
  declarations: [MedialistPage]
})
export class MedialistPageModule {}
