import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MedialistPage } from './medialist.page';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../media.service';
import { of } from 'rxjs';

describe('MedialistPage', () => {
  let component: MedialistPage;
  let fixture: ComponentFixture<MedialistPage>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('MediaService', ['getMediaFromArtist', 'publishArtistMedia']);
    spy.getMediaFromArtist.and.returnValue(of([]));

    TestBed.configureTestingModule({
      declarations: [MedialistPage, VirtualGridComponent, SearchFilterComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, FormsModule],
      providers: [{ provide: MediaService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(MedialistPage);
    component = fixture.componentInstance;
    component.artist = { name: 'Test Artist', albumCount: '1', cover: 'test.jpg', coverMedia: null };
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
