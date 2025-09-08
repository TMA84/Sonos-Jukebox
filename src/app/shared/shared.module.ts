import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { VirtualKeyboardComponent } from './virtual-keyboard/virtual-keyboard.component';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { PinDialogComponent } from '../pin-dialog/pin-dialog.component';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ArtistSearchComponent } from '../artist-search/artist-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';

@NgModule({
  declarations: [
    VirtualKeyboardComponent,
    VirtualGridComponent,
    SearchFilterComponent,
    PinDialogComponent,
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
    PinDialogComponent,
    AlbumSearchComponent,
    ArtistSearchComponent,
    ServiceSearchComponent
  ]
})
export class SharedModule { }