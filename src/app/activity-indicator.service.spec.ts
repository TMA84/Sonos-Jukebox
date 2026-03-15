import { TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivityIndicatorService } from './activity-indicator.service';

describe('ActivityIndicatorService', () => {
  let service: ActivityIndicatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot()],
    });
    service = TestBed.inject(ActivityIndicatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
