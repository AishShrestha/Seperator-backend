import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Group } from './entity/group.entity';
import { GroupMember } from './entity/group-member.entity';
import { GroupRole } from './enums/group-role.enum';
import { customAlphabet } from 'nanoid';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Expense } from '../expense/entity/expense.entity';
import { ExpenseShare } from '../expense/entity/expenseShare.entity';
import { ExpensePayment } from '../expense/entity/expensePayment.entity';
import { Settlement } from '../settlement/entity/settlement.entity';
import { GroupSummaryForUser } from './interface/group-summary-for-users.interface';
import {
  BalanceOweItem,
  GroupBalanceForUser,
} from './interface/group-balance.interface';



@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(Group) private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember) private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Expense) private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(ExpenseShare) private readonly expenseShareRepository: Repository<ExpenseShare>,
    @InjectRepository(ExpensePayment) private readonly expensePaymentRepository: Repository<ExpensePayment>,
    @InjectRepository(Settlement) private readonly settlementRepository: Repository<Settlement>,
  ) {}

  // Create a new group with the given name and associate the creating user as OWNER
  async createGroup(createGroupDto: CreateGroupDto, userId: string): Promise<Group & { userRole: GroupRole }> {
    try {
      const { name } = createGroupDto;

      if (!userId) {
        throw new BadRequestException('User ID is required to create a group');
      }

      const newGroup = this.groupRepository.create({
        name,
        invite_code: this.generateInviteCode(),
      });

      const savedGroup = await this.groupRepository.save(newGroup);

      if (!savedGroup) {
        throw new InternalServerErrorException('Failed to create group');
      }

      const membership = this.groupMemberRepository.create({
        user_id: userId,
        group_id: savedGroup.id,
        role: GroupRole.OWNER,
      });

      await this.groupMemberRepository.save(membership);

      return { ...savedGroup, userRole: GroupRole.OWNER };
    } catch (error) {
      this.handleGroupError(error, 'creating group');
    }
  }

  // Retrieve all groups that a user belongs to with summary (name, invite code, member count, expense count, user balance)
  async getGroupsForUser(userId: string): Promise<GroupSummaryForUser[]> {
    try {
      const memberships = await this.groupMemberRepository.find({
        where: { user_id: userId },
        relations: ['group'],
      });

      if (memberships.length === 0) {
        return [];
      }

      const groupIds = memberships.map((m) => m.group.id);

      const [memberCounts, expenseCounts, totalPaidByUser, totalShareByUser] = await Promise.all([
        this.getMemberCountByGroup(groupIds),
        this.getExpenseCountByGroup(groupIds),
        this.getTotalPaidByUserPerGroup(userId, groupIds),
        this.getTotalShareByUserPerGroup(userId, groupIds),
      ]);

      return memberships.map((m) => {
        const groupId = m.group_id;
        const paid = Number(totalPaidByUser[groupId] ?? 0);
        const share = Number(totalShareByUser[groupId] ?? 0);
        const balance = paid - share;
        return {
          group_id: groupId,
          group_name: m.group.name,
          invitation_code: m.group.invite_code,
          total_members: memberCounts[groupId] ?? 0,
          total_number_of_expenses: expenseCounts[groupId] ?? 0,
          balance,
        };
      });
    } catch (error) {
      this.handleGroupError(error, 'retrieving groups for user');
    }
  }

  private async getMemberCountByGroup(groupIds: string[]): Promise<Record<string, number>> {
    const rows = await this.groupMemberRepository
      .createQueryBuilder('gm')
      .select('gm.group_id', 'group_id')
      .addSelect('COUNT(*)', 'count')
      .where('gm.group_id IN (:...groupIds)', { groupIds })
      .groupBy('gm.group_id')
      .getRawMany<{ group_id: string; count: string }>();
    return Object.fromEntries(rows.map((r) => [r.group_id, Number(r.count)]));
  }

  private async getExpenseCountByGroup(groupIds: string[]): Promise<Record<string, number>> {
    const rows = await this.expenseRepository
      .createQueryBuilder('e')
      .select('e.group_id', 'group_id')
      .addSelect('COUNT(*)', 'count')
      .where('e.group_id IN (:...groupIds)', { groupIds })
      .groupBy('e.group_id')
      .getRawMany<{ group_id: string; count: string }>();
    return Object.fromEntries(rows.map((r) => [r.group_id, Number(r.count)]));
  }

  private async getTotalPaidByUserPerGroup(
    userId: string,
    groupIds: string[],
  ): Promise<Record<string, number>> {
    const rows = await this.expensePaymentRepository
      .createQueryBuilder('ep')
      .innerJoin('ep.expense', 'e')
      .select('e.group_id', 'group_id')
      .addSelect('COALESCE(SUM(ep.amount_paid), 0)', 'total')
      .where('e.group_id IN (:...groupIds)', { groupIds })
      .andWhere('ep.user_id = :userId', { userId })
      .groupBy('e.group_id')
      .getRawMany<{ group_id: string; total: string }>();
    return Object.fromEntries(rows.map((r) => [r.group_id, Number(r.total)]));
  }

  private async getTotalShareByUserPerGroup(
    userId: string,
    groupIds: string[],
  ): Promise<Record<string, number>> {
    const rows = await this.expenseShareRepository
      .createQueryBuilder('es')
      .innerJoin('es.expense', 'e')
      .innerJoin('es.user', 'u')
      .select('e.group_id', 'group_id')
      .addSelect('COALESCE(SUM(es.share), 0)', 'total')
      .where('e.group_id IN (:...groupIds)', { groupIds })
      .andWhere('u.id = :userId', { userId })
      .groupBy('e.group_id')
      .getRawMany<{ group_id: string; total: string }>();
    return Object.fromEntries(rows.map((r) => [r.group_id, Number(r.total)]));
  }

  // Update group details such as name
  async updateGroup(groupId: string, updateData: UpdateGroupDto): Promise<Group> {
    try {
      const group = await this.groupRepository.preload({
        id: groupId,
        ...updateData,
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      return await this.groupRepository.save(group);
    } catch (error) {
      this.handleGroupError(error, 'updating group');
    }
  }

  // Allow a user to join a group using an invite code
  async joinGroup(inviteCode: string, userId: string): Promise<Group & { userRole: GroupRole }> {
    try {
      const group = await this.groupRepository.findOne({
        where: { invite_code: inviteCode },
      });

      if (!group) {
        throw new BadRequestException('Invalid invite code');
      }

      const existingMembership = await this.groupMemberRepository.findOne({
        where: { user_id: userId, group_id: group.id },
      });

      if (existingMembership) {
        throw new BadRequestException('You are already a member of this group');
      }

      const membership = this.groupMemberRepository.create({
        user_id: userId,
        group_id: group.id,
        role: GroupRole.MEMBER,
      });

      await this.groupMemberRepository.save(membership);

      return { ...group, userRole: GroupRole.MEMBER };
    } catch (error) {
      this.handleGroupError(error, 'joining group');
    }
  }

  // Retrieve a group by its unique group ID
  async getGroupByGroupId(groupId: string): Promise<Group> {
    try {
      if (!groupId) {
        throw new BadRequestException('Group ID is required');
      }

      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new BadRequestException('Group not found');
      }

      return group;
    } catch (error) {
      this.handleGroupError(error, 'retrieving group');
    }
  }

  // Get group details and member avatars by groupId
  async getGroupWithMembers(groupId: string): Promise<{
    group_id: string;
    group_name: string;
    invite_code: string;
    members: { user_id: string; avatar: string | null }[];
  }> {
    try {
      const rawResults = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoin('group.members', 'member')
        .leftJoin('member.user', 'user')
        .where('group.id = :groupId', { groupId })
        .select([
          'group.id',
          'group.name',
          'group.invite_code',
          'member.user_id',
          'user.avatar',
        ])
        .getRawMany();

      if (!rawResults || rawResults.length === 0) {
        throw new NotFoundException('Group not found');
      }

      const { group_id, group_name, group_invite_code } = rawResults[0];

      const members = rawResults
        .filter((row) => row.member_user_id)
        .map((row) => ({
          user_id: row.member_user_id,
          avatar: row.user_avatar,
        }));

      return {
        group_id,
        group_name,
        invite_code: group_invite_code,
        members,
      };
    } catch (error) {
      this.handleGroupError(error, 'retrieving group with members');
    }
  }

  /**
   * Returns the current user's total balance in the group and breakdown of
   * who they owe / who owes them (net amounts).
   */
  async getGroupBalanceForUser(
    groupId: string,
    userId: string,
  ): Promise<GroupBalanceForUser> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: userId, group_id: groupId },
      });
      if (!membership) {
        throw new NotFoundException('You are not a member of this group');
      }

      const [totalPaid, totalShare, settlements] = await Promise.all([
        this.getTotalPaidByUserPerGroup(userId, [groupId]),
        this.getTotalShareByUserPerGroup(userId, [groupId]),
        this.settlementRepository.find({
          where: { group_id: groupId },
          select: ['payer_id', 'payee_id', 'amount'],
        }),
      ]);
      const paid = Number(totalPaid[groupId] ?? 0);
      const share = Number(totalShare[groupId] ?? 0);
      const round = (n: number) => Math.round(n * 100) / 100;
      let balance = round(paid - share);
      for (const s of settlements) {
        const amt = Number(s.amount);
        if (balance < 0) {
          // If user owes money (negative balance), and user is payer, they pay to reduce what they owe (balance less negative)
          if (s.payer_id === userId) balance += amt;
          // If user owes money and user is payee, they receive money, which increases what they owe (balance more negative)
          if (s.payee_id === userId) balance -= amt;
        } else {
          // User is to receive money (positive balance), and another paid on their behalf, so update accordingly
          if (s.payee_id === userId) balance -= amt;
          if (s.payer_id === userId) balance += amt;
        }
      }

      balance = round(balance);


      const expenses = await this.expenseRepository.find({
        where: { group_id: groupId },
        relations: ['payments', 'payments.user', 'shares', 'shares.user'],
      });

      const debt: Record<string, Record<string, number>> = {};
      const userIdToName: Record<string, string> = {};

      for (const expense of expenses) {
        const payments = expense.payments ?? [];
        const shares = expense.shares ?? [];
        const totalPaidExp = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
        if (totalPaidExp <= 0) continue;

        for (const sh of shares) {
          const sharerId = sh.user_id;
          const shareAmt = Number(sh.share);
          if (sh.user?.name) userIdToName[sharerId] = sh.user.name;

          for (const pay of payments) {
            const payerId = pay.user_id;
            const payAmt = Number(pay.amount_paid);
            if (pay.user?.name) userIdToName[payerId] = pay.user.name;

            const amount = (shareAmt * payAmt) / totalPaidExp;
            if (!debt[sharerId]) debt[sharerId] = {};
            debt[sharerId][payerId] = (debt[sharerId][payerId] ?? 0) + amount;
          }
        }
      }

      // Apply settlements: payer paid payee → reduce debt[payer][payee]
      for (const s of settlements) {
        const payerId = s.payer_id;
        const payeeId = s.payee_id;
        const amt = Number(s.amount);
        if (!debt[payerId]) debt[payerId] = {};
        debt[payerId][payeeId] = (debt[payerId][payeeId] ?? 0) - amt;
      }

      const allUserIds = new Set<string>([
        ...Object.keys(debt),
        ...Object.values(debt).flatMap((o) => Object.keys(o)),
      ]);
      const net = (from: string, to: string): number =>
        (debt[from]?.[to] ?? 0) - (debt[to]?.[from] ?? 0);

      const you_owe: BalanceOweItem[] = [];
      const owes_you: BalanceOweItem[] = [];

      for (const otherId of allUserIds) {
        if (otherId === userId) continue;
        const netYouToThem = net(userId, otherId);
        const netThemToYou = net(otherId, userId);
        if (netYouToThem > 0.005) {
          you_owe.push({
            user_id: otherId,
            user_name: userIdToName[otherId] ?? '',
            amount: round(netYouToThem),
          });
        }
        if (netThemToYou > 0.005) {
          owes_you.push({
            user_id: otherId,
            user_name: userIdToName[otherId] ?? '',
            amount: round(netThemToYou),
          });
        }
      }

      return { balance, you_owe, owes_you };
    } catch (error) {
      this.handleGroupError(error, 'getting group balance for user');
    }
  }

  // Get user's role in a group
  async getUserRoleInGroup(userId: string, groupId: string): Promise<GroupRole | null> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: userId, group_id: groupId },
      });

      return membership?.role ?? null;
    } catch (error) {
      this.handleGroupError(error, 'retrieving user role in group');
    }
  }

  // Update a member's role (only OWNER can do this)
  async updateMemberRole(groupId: string, targetUserId: string, newRole: GroupRole): Promise<GroupMember> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: targetUserId, group_id: groupId },
      });

      if (!membership) {
        throw new NotFoundException('User is not a member of this group');
      }

      if (membership.role === GroupRole.OWNER) {
        throw new BadRequestException('Cannot change the role of the group owner');
      }

      if (newRole === GroupRole.OWNER) {
        throw new BadRequestException('Cannot promote a member to owner');
      }

      if (membership.role === newRole) {
        throw new BadRequestException('User already has this role');
      }

      membership.role = newRole;
      return this.groupMemberRepository.save(membership);
    } catch (error) {
      this.handleGroupError(error, 'updating member role');
    }
  }

  // Remove a member from the group. Only owner and admin can remove; only owner can remove an admin.
  async removeMember(
    groupId: string,
    targetUserId: string,
    callerRole: GroupRole,
  ): Promise<void> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: targetUserId, group_id: groupId },
      });

      if (!membership) {
        throw new NotFoundException('User is not a member of this group');
      }

      if (membership.role === GroupRole.OWNER) {
        throw new BadRequestException('Cannot remove the group owner');
      }

      if (membership.role === GroupRole.ADMIN && callerRole !== GroupRole.OWNER) {
        throw new BadRequestException('Only the group owner can remove an admin');
      }

      await this.groupMemberRepository.remove(membership);
    } catch (error) {
      this.handleGroupError(error, 'removing member');
    }
  }

  // Allow the current user to leave a group (owner cannot leave until they transfer ownership)
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: userId, group_id: groupId },
      });

      if (!membership) {
        throw new NotFoundException('You are not a member of this group');
      }

      if (membership.role === GroupRole.OWNER) {
        throw new BadRequestException(
          'Group owner cannot leave. Transfer ownership to another member first.',
        );
      }

      await this.groupMemberRepository.remove(membership);
    } catch (error) {
      this.handleGroupError(error, 'leaving group');
    }
  }

  /**
   * Rethrows known HTTP exceptions; logs and wraps unexpected errors.
   */
  private handleGroupError(error: unknown, context: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Group ${context} failed: ${message}`, stack);
    throw new InternalServerErrorException(
      `An unexpected error occurred while ${context}. Please try again.`,
    );
  }

  // Generate a unique invite code for the group
  private generateInviteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const nanoid = customAlphabet(alphabet, 8);
    return nanoid();
  }
}
