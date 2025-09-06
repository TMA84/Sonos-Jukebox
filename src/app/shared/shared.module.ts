import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';
import { ArtistSearchComponent } from '../artist-search/artist-search.component';
import { PinDialogComponent } from '../pin-dialog/pin-dialog.component';

@NgModule({
  declarations: [
    VirtualGridComponent,
    SearchFilterComponent,
    AlbumSearchComponent,
    ServiceSearchComponent,
    ArtistSearchComponent,
    PinDialogComponent
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
    ServiceSearchComponent,
    ArtistSearchComponent,
    PinDialogComponent
  ]
})
export class SharedModule {}