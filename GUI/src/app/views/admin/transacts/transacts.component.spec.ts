import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactsComponent } from './transacts.component';

describe('TransactsComponent', () => {
  let component: TransactsComponent;
  let fixture: ComponentFixture<TransactsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransactsComponent]
    });
    fixture = TestBed.createComponent(TransactsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
