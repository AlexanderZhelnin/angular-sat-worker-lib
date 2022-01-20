import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SatWorkerComponent } from './sat-worker.component';

describe('SatWorkerComponent', () => {
  let component: SatWorkerComponent;
  let fixture: ComponentFixture<SatWorkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SatWorkerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SatWorkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
