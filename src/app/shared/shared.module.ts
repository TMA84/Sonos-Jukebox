import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';

@NgModule({
  declarations: [
    VirtualGridComponent,
    SearchFilterComponent,
    AlbumSearchComponent,
    ServiceSearchComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    VirtualGridComponent,
    SearchFilterComponent,
    AlbumSearchComponent,
    ServiceSearchComponent
  ]
})
export class SharedModule {}