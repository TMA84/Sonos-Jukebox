import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SearchFilterComponent } from './search-filter.component';

describe('SearchFilterComponent', () => {
  let component: SearchFilterComponent;
  let fixture: ComponentFixture<SearchFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SearchFilterComponent],
      imports: [IonicModule.forRoot(), FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle search visibility', () => {
    expect(component.isVisible).toBeFalse();
    component.toggleSearch();
    expect(component.isVisible).toBeTrue();
  });

  it('should emit search changes', () => {
    spyOn(component.searchChange, 'emit');
    component.searchTerm = 'test';
    component.onSearchChange();
    expect(component.searchChange.emit).toHaveBeenCalledWith('test');
  });
});