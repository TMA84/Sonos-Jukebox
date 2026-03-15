import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MedialistPage } from './medialist.page';

describe('MedialistPage', () => {
  let component: MedialistPage;
  let fixture: ComponentFixture<MedialistPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MedialistPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, FormsModule],
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOn(router, 'getCurrentNavigation').and.returnValue({
      extras: {
        state: {
          artist: { name: 'Test Artist', albumCount: '1', cover: 'test.jpg', coverMedia: null },
        },
      },
    } as any);

    fixture = TestBed.createComponent(MedialistPage);
    component = fixture.componentInstance;
    component.artist = {
      name: 'Test Artist',
      albumCount: '1',
      cover: 'test.jpg',
      coverMedia: null,
    };
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
