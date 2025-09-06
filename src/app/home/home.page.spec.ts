import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HomePage } from './home.page';
import { VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { SearchFilterComponent } from '../search-filter/search-filter.component';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../media.service';
import { of } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let mockMediaService: jasmine.SpyObj<MediaService>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('MediaService', ['getMedia', 'getArtists', 'setCategory', 'publishArtists', 'publishMedia']);
    spy.getMedia.and.returnValue(of([]));
    spy.getArtists.and.returnValue(of([]));

    TestBed.configureTestingModule({
      declarations: [HomePage, VirtualGridComponent, SearchFilterComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, FormsModule],
      providers: [{ provide: MediaService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    mockMediaService = TestBed.inject(MediaService) as jasmine.SpyObj<MediaService>;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set initial category', () => {
    expect(component.category).toBe('audiobook');
  });
});
