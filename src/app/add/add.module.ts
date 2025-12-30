import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddPageRoutingModule } from './add-routing.module';

import { AddPage } from './add.page';
import { SharedModule } from '../shared/shared.module';
import { RadioSearchComponent } from '../radio-search/radio-search.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddPageRoutingModule,
    SharedModule
  ],
  declarations: [AddPage, RadioSearchComponent]
})
export class AddPageModule {}
