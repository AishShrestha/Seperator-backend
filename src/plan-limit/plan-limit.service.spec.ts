import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../expense/entity/expense.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { PlanLimitService } from './plan-limit.service';
import { PlanLimitAction } from './enums/plan-limit-action.enum';
import { PlanLimitException } from './plan-limit.exception';

describe('PlanLimitService', () => {
  let service: PlanLimitService;
  let expenseRepo: jest.Mocked<Repository<Expense>>;
  let groupMemberRepo: jest.Mocked<Repository<GroupMember>>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  const mockExpenseRepo = {
    count: jest.fn(),
  };
  const mockGroupMemberRepo = {
    count: jest.fn(),
  };
  const mockSubscriptionService = {
    getCurrentSubscription: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitService,
        { provide: getRepositoryToken(Expense), useValue: mockExpenseRepo },
        { provide: getRepositoryToken(GroupMember), useValue: mockGroupMemberRepo },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<PlanLimitService>(PlanLimitService);
    expenseRepo = module.get(getRepositoryToken(Expense));
    groupMemberRepo = module.get(getRepositoryToken(GroupMember));
    subscriptionService = module.get(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assertWithinLimits - CREATE_EXPENSE', () => {
    it('should pass when free user has fewer than 5 expenses in 24h', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      mockExpenseRepo.count.mockResolvedValue(3);

      await expect(
        service.assertWithinLimits('user-1', PlanLimitAction.CREATE_EXPENSE),
      ).resolves.not.toThrow();
    });

    it('should throw PlanLimitException when free user has 5+ expenses in 24h', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      mockExpenseRepo.count.mockResolvedValue(5);

      await expect(
        service.assertWithinLimits('user-1', PlanLimitAction.CREATE_EXPENSE),
      ).rejects.toThrow(PlanLimitException);
    });
  });

  describe('assertWithinLimits - CREATE_GROUP', () => {
    it('should pass when free user has fewer than 3 groups', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      mockGroupMemberRepo.count.mockResolvedValue(2);

      await expect(
        service.assertWithinLimits('user-1', PlanLimitAction.CREATE_GROUP),
      ).resolves.not.toThrow();
    });

    it('should throw PlanLimitException when free user has 3 groups', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      mockGroupMemberRepo.count.mockResolvedValue(3);

      await expect(
        service.assertWithinLimits('user-1', PlanLimitAction.CREATE_GROUP),
      ).rejects.toThrow(PlanLimitException);
    });
  });

  describe('getHistoryDaysLimit', () => {
    it('should return 30 for free plan', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);

      const limit = await service.getHistoryDaysLimit('user-1');
      expect(limit).toBe(30);
    });

    it('should return null for paid plan', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue({
        plan: { slug: 'pro-monthly' },
      } as any);

      const limit = await service.getHistoryDaysLimit('user-1');
      expect(limit).toBeNull();
    });
  });
});
