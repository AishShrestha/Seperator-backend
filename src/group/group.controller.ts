import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Auth } from 'src/common/decorator/auth.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRoles } from './decorators/group-roles.decorator';
import { GroupRole } from './enums/group-role.enum';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth/jwt-auth.guard';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @ApiBearerAuth()
  @Auth()
  @Post()
  async createGroup(@Body() createGroupDto: CreateGroupDto, @Req() req: any) {
    const userId = req?.user?.id;

    const result = await this.groupService.createGroup(createGroupDto, userId);

    return {
      message: 'Group created successfully',
      data: {
        id: result.id,
        name: result.name,
        invite_code: result.invite_code,
        role: result.userRole,
      },
    };
  }

  // IMPORTANT: Specific routes must come BEFORE wildcard routes like /:groupId
  @Get('/join/:inviteCode')
  @ApiBearerAuth()
  @Auth()
  async joinGroup(@Param('inviteCode') inviteCode: string, @Req() req: any) {
    const userId = req?.user?.id;
    const group = await this.groupService.joinGroup(inviteCode, userId);

    return {
      message: 'Joined group successfully',
      data: {
        id: group.id,
        name: group.name,
        role: group.userRole,
      },
    };
  }

  @ApiBearerAuth()
  @Auth()
  @Get('user/:userId')
  async getGroups(@Param('userId') userId: string) {
    const groups = await this.groupService.getGroupsForUser(userId);
    return {
      message: 'Groups retrieved successfully',
      data: groups,
    };
  }

  // Wildcard route - must be AFTER specific routes
  @ApiBearerAuth()
  @Auth()
  @Get('/:groupId')
  async getGroup(@Param('groupId') groupId: string, @Req() req: any) {
    const userId = req?.user?.id;
    const group = await this.groupService.getGroupWithMembers(groupId);
    const userRole = await this.groupService.getUserRoleInGroup(userId, groupId);

    return {
      ...group,
      userRole,
      members: group.members.map((m) => ({
        id: m.user?.id,
        name: m.user?.name,
        email: m.user?.email,
        role: m.role,
        joined_at: m.joined_at,
      })),
    };
  }

  @Patch('/:groupId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, GroupRolesGuard)
  @GroupRoles(GroupRole.OWNER, GroupRole.ADMIN)
  async updateGroup(@Param('groupId') groupId: string, @Body() body: UpdateGroupDto) {
    const result = await this.groupService.updateGroup(groupId, body);
    return {
      message: 'Group updated successfully',
      data: result,
    };
  }

  @Patch('/:groupId/member/:userId/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, GroupRolesGuard)
  @GroupRoles(GroupRole.OWNER)
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body('role') newRole: GroupRole,
  ) {
    const result = await this.groupService.updateMemberRole(groupId, targetUserId, newRole);
    return {
      message: 'Member role updated successfully',
      data: {
        userId: result.user_id,
        role: result.role,
      },
    };
  }

  @Delete('/:groupId/member/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, GroupRolesGuard)
  @GroupRoles(GroupRole.OWNER, GroupRole.ADMIN)
  async removeMember(@Param('groupId') groupId: string, @Param('userId') targetUserId: string) {
    await this.groupService.removeMember(groupId, targetUserId);
    return {
      message: 'Member removed successfully',
    };
  }
}
