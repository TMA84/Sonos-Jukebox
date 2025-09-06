import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { VirtualGridComponent } from './virtual-grid.component';
import { ArtworkService } from '../artwork.service';
import { of } from 'rxjs';

describe('VirtualGridComponent', () => {
  let component: VirtualGridComponent;
  let fixture: ComponentFixture<VirtualGridComponent>;
  let mockArtworkService: jasmine.SpyObj<ArtworkService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ArtworkService', ['getArtwork']);

    await TestBed.configureTestingModule({
      declarations: [VirtualGridComponent],
      imports: [IonicModule.forRoot()],
      providers: [{ provide: ArtworkService, useValue: spy }],
      schemas: []
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualGridComponent);
    component = fixture.componentInstance;
    mockArtworkService = TestBed.inject(ArtworkService) as jasmine.SpyObj<ArtworkService>;
    mockArtworkService.getArtwork.and.returnValue(of('test-url'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial items', () => {
    component.items = [
      { title: 'Test Album', artist: 'Test Artist', cover: 'test.jpg', type: 'local', category: 'audiobook' }
    ];
    component.ngOnInit();
    expect(component.displayedItems.length).toBe(1);
  });

  it('should filter items by search term', () => {
    component.items = [
      { title: 'Test Album', artist: 'Test Artist', cover: 'test.jpg', type: 'local', category: 'audiobook' },
      { title: 'Another Album', artist: 'Another Artist', cover: 'test2.jpg', type: 'local', category: 'audiobook' }
    ];
    component.onSearchChange('test');
    expect(component.filteredItems.length).toBe(1);
  });
});