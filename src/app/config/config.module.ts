import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ConfigPageRoutingModule } from './config-routing.module';
import { ConfigPage } from './config.page';
import { SharedModule } from '../shared/shared.module';
import { AlarmEditComponent } from '../alarm-edit/alarm-edit.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ConfigPageRoutingModule, SharedModule],
  declarations: [ConfigPage, AlarmEditComponent],
})
export class ConfigPageModule {}
