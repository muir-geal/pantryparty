import { TestBed } from '@angular/core/testing';

import { ReserveFoodService } from './reserve-food.service';

describe('ReserveFoodService', () => {
  let service: ReserveFoodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReserveFoodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
