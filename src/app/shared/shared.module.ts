import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { VirtualKeyboardComponent } from '../virtual-keyboard/virtual-keyboard.component';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ArtistSearchComponent } from '../artist-search/artist-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';

@NgModule({
  declarations: [
    VirtualKeyboardComponent,
    VirtualGridComponent,
    SearchFilterComponent,
    AlbumSearchComponent,
    ArtistSearchComponent,
    ServiceSearchComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [
    VirtualKeyboardComponent,
    VirtualGridComponent,
    SearchFilterComponent,
    AlbumSearchComponent,
    ArtistSearchComponent,
    ServiceSearchComponent
  ]
})
export class SharedModule { }
