import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Auth } from 'src/common/decorator/auth.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRoles } from './decorators/group-roles.decorator';
import { GroupRole } from './enums/group-role.enum';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth/jwt-auth.guard';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

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

  @ApiBearerAuth()
  @Auth()
  @Get('user')
  async getGroups(@Req() req: any) {
    const userId = req?.user?.id;
    const groups = await this.groupService.getGroupsForUser(userId);
    return {
      message: 'Groups retrieved successfully',
      data: groups,
    };
  }

  @Get('join/:inviteCode')
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


  @Patch(':groupId/member/:userId/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, GroupRolesGuard)
  @GroupRoles(GroupRole.OWNER)
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() body: UpdateMemberRoleDto,
  ) {
    const result = await this.groupService.updateMemberRole(groupId, targetUserId, body.role);
    return {
      message: 'Member role updated successfully',
      data: {
        userId: result.user_id,
        role: result.role,
      },
    };
  }

  @Delete(':groupId/member/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, GroupRolesGuard)
  @GroupRoles(GroupRole.OWNER, GroupRole.ADMIN)
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ) {
    const callerRole = req.groupMembership?.role;
    await this.groupService.removeMember(groupId, targetUserId, callerRole);
    return {
      message: 'Member removed successfully',
    };
  }

  @Post(':groupId/leave')
  @ApiBearerAuth()
  @Auth()
  async leaveGroup(@Param('groupId') groupId: string, @Req() req: any) {
    const userId = req?.user?.id;
    await this.groupService.leaveGroup(userId, groupId);
    return {
      message: 'Left group successfully',
    };
  }

  @Patch(':groupId')
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

  @ApiBearerAuth()
  @Auth()
  @Get(':groupId')
  async getGroup(@Param('groupId') groupId: string, @Req() req: any) {
    const userId = req?.user?.id;
    const [group, userRole] = await Promise.all([
      this.groupService.getGroupWithMembers(groupId),
      this.groupService.getUserRoleInGroup(userId, groupId),
    ]);

    return {
      message: 'Group retrieved successfully',
      data: {
        ...group,
        userRole,
      },
    };
  }
}
