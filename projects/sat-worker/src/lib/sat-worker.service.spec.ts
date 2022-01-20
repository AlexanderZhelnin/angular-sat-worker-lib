import { TestBed } from '@angular/core/testing';

import { SatWorkerService } from './sat-worker.service';

describe('SatWorkerService', () => {
  let service: SatWorkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SatWorkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
