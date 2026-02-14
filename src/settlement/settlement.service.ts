import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settlement } from './entity/settlement.entity';
import { Group } from '../group/entity/group.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementListItem } from './interfaces/settlement-list-item.interface';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(Settlement)
    private readonly settlementRepository: Repository<Settlement>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async createSettlement(
    dto: CreateSettlementDto,
    payerId: string,
  ): Promise<Settlement> {
    try {
      const { group_id, payee_id, amount, notes ,payment_method} = dto;

      const group = await this.groupRepository.findOne({ where: { id: group_id } });
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const [payerMembership, payeeMembership] = await Promise.all([
        this.groupMemberRepository.findOne({
          where: { user_id: payerId, group_id },
        }),
        this.groupMemberRepository.findOne({
          where: { user_id: payee_id, group_id },
        }),
      ]);

      if (!payerMembership) {
        throw new BadRequestException(
          'You must be a member of the group to add a settlement',
        );
      }
      if (!payeeMembership) {
        throw new BadRequestException('Payee must be a member of the group');
      }

      if (payerId === payee_id) {
        throw new BadRequestException('Payer and payee cannot be the same');
      }

      const settlement = this.settlementRepository.create({
        group_id,
        payer_id: payerId,
        payee_id,
        amount,
        payment_method,
        ...(notes != null && notes !== '' && { notes }),
      });

      return this.settlementRepository.save(settlement);
    } catch (error) {
      this.handleSettlementError(error, 'creating');
    }
  }

  /**
   * Returns all settlements for a group. Only group members can list settlements.
   * Ordered by created_at descending (newest first).
   */
  async getSettlementsByGroupId(
    groupId: string,
    userId: string,
  ): Promise<SettlementListItem[]> {
    try {
      const membership = await this.groupMemberRepository.findOne({
        where: { user_id: userId, group_id: groupId },
      });
      if (!membership) {
        throw new NotFoundException('You are not a member of this group');
      }

      const settlements = await this.settlementRepository.find({
        where: { group_id: groupId },
        relations: ['payer', 'payee'],
        order: { created_at: 'DESC' },
      });

      return settlements.map((s) => this.toSettlementListItem(s));
    } catch (error) {
      this.handleSettlementError(error, 'retrieving settlements for group');
    }
  }

  private toSettlementListItem(s: Settlement): SettlementListItem {
    return {
      settlement_id: s.id,
      group_id: s.group_id,
      payer_id: s.payer_id,
      payer_name: s.payer?.name ?? '',
      payer_avatar: s.payer?.avatar ?? '',
      payee_id: s.payee_id,
      payee_name: s.payee?.name ?? '',
      payee_avatar: s.payee?.avatar ?? '',
      amount: Number(s.amount),
      settled_at: s.settled_at ? s.settled_at.toISOString() : null,
      payment_method: s.payment_method ?? null,
      notes: s.notes ?? null,
      status: 'Settled',
    };
  }

  /**
   * Rethrows known HTTP exceptions; logs and wraps unexpected errors.
   */
  private handleSettlementError(error: unknown, context: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Settlement ${context} failed: ${message}`, stack);
    throw new InternalServerErrorException(
      `An unexpected error occurred while ${context} the settlement. Please try again.`,
    );
  }
}
