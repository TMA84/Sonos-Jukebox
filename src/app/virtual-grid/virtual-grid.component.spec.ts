import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { VirtualGridComponent } from './virtual-grid.component';

describe('VirtualGridComponent', () => {
  let component: VirtualGridComponent;
  let fixture: ComponentFixture<VirtualGridComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [VirtualGridComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [IonicModule.forRoot(), HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualGridComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter items by search term', () => {
    component.items = [
      {
        title: 'Test Album',
        artist: 'Test Artist',
        cover: 'test.jpg',
        type: 'local',
        category: 'audiobook',
      },
      {
        title: 'Another Album',
        artist: 'Another Artist',
        cover: 'test2.jpg',
        type: 'local',
        category: 'audiobook',
      },
    ];
    component.onSearchChange('test');
    expect(component.filteredItems.length).toBe(1);
  });
});
