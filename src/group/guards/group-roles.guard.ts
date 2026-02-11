import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupRole } from '../enums/group-role.enum';
import { GROUP_ROLES_KEY } from '../decorators/group-roles.decorator';
import { GroupMember } from '../entity/group-member.entity';

@Injectable()
export class GroupRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<GroupRole[]>(GROUP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }   

        

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract groupId from request params, query, or body
    const groupId = request.params?.groupId || request.query?.groupId || request.body?.groupId;

    if (!groupId) {
      throw new ForbiddenException('Group ID is required');
    }

    // Get user's membership in this group
    const membership = await this.groupMemberRepository.findOne({
      where: {
        user_id: user.id,
        group_id: groupId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Check if user's role matches any of the required roles
    const hasRole = requiredRoles.some((role) => membership.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }
    console.log("membership",membership);

    // Attach membership to request for use in controllers
    request.groupMembership = membership;

    return true;
  }
}
