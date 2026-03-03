import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { PlanLimitService } from '../plan-limit/plan-limit.service';

describe('GroupService', () => {
  let service: GroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: PlanLimitService,
          useValue: {
            assertWithinLimits: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
