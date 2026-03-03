import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseService } from './expense.service';
import { PlanLimitService } from '../plan-limit/plan-limit.service';

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        {
          provide: PlanLimitService,
          useValue: {
            assertWithinLimits: jest.fn().mockResolvedValue(undefined),
            getHistoryDaysLimit: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
