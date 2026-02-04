import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { SharedModule } from '../shared/shared.module';
import { AlarmManagerComponent } from '../alarm-manager/alarm-manager.component';
import { AlarmNotificationComponent } from '../alarm-notification/alarm-notification.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule, SharedModule],
  declarations: [HomePage, AlarmManagerComponent, AlarmNotificationComponent],
})
export class HomePageModule {}
