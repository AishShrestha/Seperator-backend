import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../../group/entity/group.entity';
import { PlanLimitService } from '../plan-limit.service';
import { PLAN_LIMIT_KEY } from '../decorators/plan-limit.decorator';
import { PlanLimitAction } from '../enums/plan-limit-action.enum';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitService: PlanLimitService,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<PlanLimitAction | undefined>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    let contextData: { groupId?: string } | undefined;

    if (action === PlanLimitAction.ADD_GROUP_MEMBER) {
      const groupId = request.params?.groupId;
      const inviteCode = request.params?.inviteCode;

      if (groupId) {
        contextData = { groupId };
      } else if (inviteCode) {
        const group = await this.groupRepository.findOne({
          where: { invite_code: inviteCode },
          select: ['id'],
        });
        if (group) {
          contextData = { groupId: group.id };
        }
      }

      if (!contextData?.groupId) {
        return true; // Let downstream validation handle missing group
      }
    }

    await this.planLimitService.assertWithinLimits(user.id, action, contextData);
    return true;
  }
}
