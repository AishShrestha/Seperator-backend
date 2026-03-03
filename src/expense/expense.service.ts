import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThanOrEqual, Repository } from 'typeorm';
import { Expense } from './entity/expense.entity';
import { ExpensePayment } from './entity/expensePayment.entity';
import { ExpenseShare } from './entity/expenseShare.entity';
import { Group } from '../group/entity/group.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { ExpenseCategory } from './entity/expenseCategory.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SplitType } from './enums/split-type.enum';
import {
  ExpenseListItem,
  PaidByItem,
  PaginatedExpenseList,
  SplitBetweenItem,
} from './interfaces/expense-list-item.interface';
import { PlanLimitService } from '../plan-limit/plan-limit.service';
import { PlanLimitAction } from '../plan-limit/enums/plan-limit-action.enum';

const AMOUNT_TOLERANCE = 0.01;

/** DTO shape needed to build share inputs (create and update). */
type ShareInputsDto = Pick<
  CreateExpenseDto,
  'split_type' | 'share_percentages' | 'share_exact'
>;
const DECIMAL_PLACES = 2;

type ShareInput = { user_id: string; share: number };

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(ExpensePayment)
    private readonly expensePaymentRepository: Repository<ExpensePayment>,
    @InjectRepository(ExpenseShare)
    private readonly expenseShareRepository: Repository<ExpenseShare>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(ExpenseCategory)
    private readonly expenseCategoryRepository: Repository<ExpenseCategory>,
    private readonly dataSource: DataSource,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async createExpense(dto: CreateExpenseDto, createdByUserId: string): Promise<Expense> {
    try {
      await this.planLimitService.assertWithinLimits(
        createdByUserId,
        PlanLimitAction.CREATE_EXPENSE,
      );

      const memberUserIds = await this.assertGroupAccessAndGetMemberIds(
        dto.group_id,
        createdByUserId,
      );
      const total = this.assertValidTotal(dto.total_amount);

      this.assertPaymentsConsistentWithSplitType(
        dto.payments,
        total,
        memberUserIds,
      );

      const shareInputs = this.buildShareInputs(dto, total, memberUserIds);
      const expense = await this.persistExpenseInTransaction(dto, createdByUserId, shareInputs);

      return this.findExpenseWithRelations(expense.id);
    } catch (error) {
      return this.handleExpenseError(error, 'creating');
    }
  }

  /**
   * Updates an expense and replaces all payments and shares.
   * Supports changing split_type (e.g. equal → percentage, exact → equal):
   * send the new split_type and the corresponding payments/share breakdown.
   */
  async updateExpense(
    expenseId: string,
    dto: UpdateExpenseDto,
    userId: string,
  ): Promise<Expense> {
    try {
      const expense = await this.expenseRepository.findOne({
        where: { id: expenseId },
        select: ['id', 'group_id', 'created_by'],
      });
      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      const memberUserIds = await this.assertGroupAccessAndGetMemberIds(
        expense.group_id,
        userId,
      );
      const total = this.assertValidTotal(dto.total_amount);

      this.assertPaymentsConsistentWithSplitType(
        dto.payments,
        total,
        memberUserIds,
      );

      const shareInputs = this.buildShareInputs(dto, total, memberUserIds);

      await this.dataSource.transaction(async (manager) => {
        await this.updateExpenseEntity(manager, expenseId, dto);
        await this.deletePaymentsForExpense(manager, expenseId);
        await this.deleteSharesForExpense(manager, expenseId);
        if (dto.payments?.length) {
          await this.savePayments(manager, expenseId, dto.payments);
        }
        await this.saveShares(manager, expenseId, shareInputs);
      });

      return this.findExpenseWithRelations(expenseId);
    } catch (error) {
      return this.handleExpenseError(error, 'updating');
    }
  }

  /**
   * Deletes an expense and all its payments and shares.
   * Only group members can delete an expense.
   */
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    try {
      const expense = await this.expenseRepository.findOne({
        where: { id: expenseId },
        select: ['id', 'group_id'],
      });
      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      await this.assertGroupAccessAndGetMemberIds(expense.group_id, userId);

      await this.dataSource.transaction(async (manager) => {
        await Promise.all([
          manager.getRepository(ExpenseShare).delete({ expense_id: expenseId }),
          manager.getRepository(ExpensePayment).delete({ expense_id: expenseId }),
        ]);
        await manager.getRepository(Expense).delete(expenseId);
      });
    } catch (error) {
      this.handleExpenseError(error, 'deleting');
    }
  }

  /**
   * Returns paginated expenses for a group in the format expected by the client.
   * Only group members can list expenses.
   * Applies history_days limit from user's plan (e.g. Free plan: last 30 days).
   */
  async getExpensesByGroupId(
    groupId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedExpenseList> {
    await this.assertGroupAccessAndGetMemberIds(groupId, userId);

    const historyDays = await this.planLimitService.getHistoryDaysLimit(userId);
    const where: Record<string, unknown> = { group_id: groupId };
    if (historyDays != null && historyDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - historyDays);
      where.created_at = MoreThanOrEqual(cutoff);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await this.expenseRepository.findAndCount({
      where,
      relations: ['payments', 'payments.user', 'shares', 'shares.user', 'category'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: expenses.map((expense) => this.toExpenseListItem(expense)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  private toExpenseListItem(expense: Expense): ExpenseListItem {
    const paid_by: PaidByItem[] = (expense.payments ?? []).map((p) => ({
      user_id: p.user_id,
      user_name: p.user?.name ?? '',
      amount_paid: Number(p.amount_paid),
    }));

    const split_between: SplitBetweenItem[] = (expense.shares ?? []).map((s) => ({
      user_id: s.user_id,
      user_name: s.user?.name ?? '',
      split_price: Number(s.share),
    }));

    return {
      expense_id: expense.id,
      expense_name: expense.description,
      total_amount: Number(expense.total_amount),
      paid_by,
      category_name: expense.category?.name ?? null,
      created_at: expense.created_at,
      split_between,
    };
  }

  private async assertGroupAccessAndGetMemberIds(
    groupId: string,
    userId: string,
  ): Promise<Set<string>> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.groupMemberRepository.findOne({
      where: { user_id: userId, group_id: groupId },
    });
    if (!membership) {
      throw new BadRequestException('You must be a member of the group to add an expense');
    }

    return this.getGroupMemberUserIds(groupId);
  }

  private assertValidTotal(totalAmount: number): number {
    const total = Number(totalAmount);
    if (total <= 0 || !Number.isFinite(total)) {
      throw new BadRequestException('total_amount must be a positive number');
    }
    return total;
  }

  private assertPaymentsConsistentWithSplitType(
    payments: CreateExpenseDto['payments'] | UpdateExpenseDto['payments'],
    total: number,
    memberUserIds: Set<string>,
  ): void {
    this.assertPaymentsProvidedAndValid(payments, total, memberUserIds);
  }

  private assertPaymentsProvidedAndValid(
    payments: CreateExpenseDto['payments'] | UpdateExpenseDto['payments'],
    total: number,
    memberUserIds: Set<string>,
  ): void {
    if (!payments?.length) {
      throw new BadRequestException(
        'payments are required (at least one; must sum to total_amount)',
      );
    }
    this.assertSumEquals(
      payments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
      total,
      'Payments total',
      'expense total_amount',
    );
    const payerIds = payments.map((p) => p.user_id);
    this.assertAllUsersAreMembers(payerIds, memberUserIds, 'payers');
  }

  private assertSumEquals(
    actual: number,
    expected: number,
    actualLabel: string,
    expectedLabel: string,
  ): void {
    if (Math.abs(actual - expected) > AMOUNT_TOLERANCE) {
      throw new BadRequestException(
        `${actualLabel} (${actual.toFixed(DECIMAL_PLACES)}) must equal ${expectedLabel} (${expected})`,
      );
    }
  }

  private assertNoDuplicateUserIds(
    items: { user_id: string }[],
    fieldName: string,
  ): void {
    const ids = items.map((i) => i.user_id);
    const unique = new Set(ids);
    if (unique.size !== items.length) {
      throw new BadRequestException(`${fieldName} must not contain duplicate user_id`);
    }
  }

  private assertAllUsersAreMembers(
    userIds: string[],
    memberUserIds: Set<string>,
    context: string,
  ): void {
    const nonMember = userIds.find((id) => !memberUserIds.has(id));
    if (nonMember) {
      throw new BadRequestException(
        `User ${nonMember} is not a member of this group. All ${context} must be group members.`,
      );
    }
  }

  private roundAmount(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private buildShareInputs(
    dto: ShareInputsDto,
    total: number,
    memberUserIds: Set<string>,
  ): ShareInput[] {
    const { split_type, share_percentages, share_exact } = dto;

    switch (split_type) {
      case SplitType.EQUAL:
        return this.buildEqualShareInputs(total, memberUserIds);
      case SplitType.PERCENTAGE:
        return this.buildPercentageShareInputs(total, share_percentages, memberUserIds);
      case SplitType.EXACT:
        return this.buildExactShareInputs(total, share_exact, memberUserIds);
      default:
        throw new BadRequestException(`Invalid split_type: ${split_type}`);
    }
  }

  private buildEqualShareInputs(total: number, memberUserIds: Set<string>): ShareInput[] {
    const count = memberUserIds.size;
    if (count === 0) {
      throw new BadRequestException('Group has no members; cannot create an equal split.');
    }
    const shareEach = this.roundAmount(total / count);
    return Array.from(memberUserIds).map((user_id) => ({ user_id, share: shareEach }));
  }

  private buildPercentageShareInputs(
    total: number,
    sharePercentages: CreateExpenseDto['share_percentages'],
    memberUserIds: Set<string>,
  ): ShareInput[] {
    if (!sharePercentages?.length) {
      throw new BadRequestException(
        'share_percentages is required when split_type is percentage',
      );
    }
    const sumPct = sharePercentages.reduce((s, i) => s + i.percentage, 0);
    this.assertSumEquals(sumPct, 100, 'share_percentages sum', '100');

    this.assertNoDuplicateUserIds(sharePercentages, 'share_percentages');
    this.assertAllUsersAreMembers(
      sharePercentages.map((i) => i.user_id),
      memberUserIds,
      'users in share_percentages',
    );

    return sharePercentages.map((item) => ({
      user_id: item.user_id,
      share: this.roundAmount((total * item.percentage) / 100),
    }));
  }

  private buildExactShareInputs(
    total: number,
    shareExact: CreateExpenseDto['share_exact'],
    memberUserIds: Set<string>,
  ): ShareInput[] {
    if (!shareExact?.length) {
      throw new BadRequestException('share_exact is required when split_type is exact');
    }
    const sumExact = shareExact.reduce((s, i) => s + Number(i.amount), 0);
    this.assertSumEquals(sumExact, total, 'share_exact total', 'total_amount');

    this.assertNoDuplicateUserIds(shareExact, 'share_exact');
    this.assertAllUsersAreMembers(
      shareExact.map((i) => i.user_id),
      memberUserIds,
      'users in share_exact',
    );

    return shareExact.map((item) => ({
      user_id: item.user_id,
      share: this.roundAmount(Number(item.amount)),
    }));
  }

  private async persistExpenseInTransaction(
    dto: CreateExpenseDto,
    createdByUserId: string,
    shareInputs: ShareInput[],
  ): Promise<Expense> {
    const { group_id, payments } = dto;

    return this.dataSource.transaction(async (manager) => {
      const savedExpense = await this.saveExpense(manager, dto, createdByUserId);

      if (payments?.length) {
        await this.savePayments(manager, savedExpense.id, payments);
      }
      await this.saveShares(manager, savedExpense.id, shareInputs);

      return savedExpense;
    });
  }

  private async saveExpense(
    manager: EntityManager,
    dto: CreateExpenseDto,
    createdByUserId: string,
  ): Promise<Expense> {
    const repo = manager.getRepository(Expense);
    const entity = repo.create({
      group_id: dto.group_id,
      description: dto.description,
      total_amount: dto.total_amount,
      created_by: createdByUserId,
      ...(dto.category_id != null && { category_id: dto.category_id }),
      split_type: dto.split_type,
    });
    return repo.save(entity);
  }

  private async updateExpenseEntity(
    manager: EntityManager,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<void> {
    const repo = manager.getRepository(Expense);
    await repo.update(expenseId, {
      description: dto.description,
      total_amount: dto.total_amount,
      ...(dto.category_id != null && { category_id: dto.category_id }),
      split_type: dto.split_type,
    });
  }

  private async deletePaymentsForExpense(
    manager: EntityManager,
    expenseId: string,
  ): Promise<void> {
    await manager.getRepository(ExpensePayment).delete({ expense_id: expenseId });
  }

  private async deleteSharesForExpense(
    manager: EntityManager,
    expenseId: string,
  ): Promise<void> {
    await manager.getRepository(ExpenseShare).delete({ expense_id: expenseId });
  }

  private async savePayments(
    manager: EntityManager,
    expenseId: string,
    payments: NonNullable<CreateExpenseDto['payments']>,
  ): Promise<void> {
    const repo = manager.getRepository(ExpensePayment);
    for (const p of payments) {
      const payment = repo.create({
        expense_id: expenseId,
        user_id: p.user_id,
        amount_paid: p.amount_paid,
      });
      await repo.save(payment);
    }
  }

  private async saveShares(
    manager: EntityManager,
    expenseId: string,
    shareInputs: ShareInput[],
  ): Promise<void> {
    const repo = manager.getRepository(ExpenseShare);
    for (const s of shareInputs) {
      const share = repo.create({
        expense_id: expenseId,
        user: { id: s.user_id },
        share: s.share,
      } as Partial<ExpenseShare>);
      await repo.save(share);
    }
  }

  private async findExpenseWithRelations(expenseId: string): Promise<Expense> {
    const result = await this.expenseRepository.findOne({
      where: { id: expenseId },
      relations: ['payments', 'shares'],
    });
    if (!result) {
      throw new InternalServerErrorException(
        'Expense was created but could not be retrieved. Please try fetching it by id.',
      );
    }
    return result;
  }

  /**
   * Rethrows known HTTP exceptions; logs and wraps unexpected errors.
   * @param context - e.g. 'creating', 'updating', 'deleting' (for logs and message)
   */
  private handleExpenseError(error: unknown, context: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Expense ${context} failed: ${message}`, stack);
    throw new InternalServerErrorException(
      `An unexpected error occurred while ${context} the expense. Please try again.`,
    );
  }

  private async getGroupMemberUserIds(groupId: string): Promise<Set<string>> {
    const members = await this.groupMemberRepository.find({
      where: { group_id: groupId },
      select: ['user_id'],
    });
    return new Set(members.map((m) => m.user_id));
  }
}
