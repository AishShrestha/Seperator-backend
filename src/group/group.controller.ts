import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Auth } from 'src/common/decorator/auth.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}
  @ApiBearerAuth()
  @Auth()
  @Post()
  async createGroup(@Body() createGroupDto: CreateGroupDto, @Req() req: any) {
    const userId = req?.user?.id;

    const result = await this.groupService.createGroup(createGroupDto, userId);

    const response = {
      id: result.id,
      name: result.name,
      invide_code: result.invite_code,
      userId: result.users?.[0]?.id,
    };
    return response;
  }

  @ApiBearerAuth()
  @Auth()
  @Get('/:groupId')
  async getGroup(@Param('groupId') groupId: string) {
    const group = await this.groupService.getGroupByGroupId(groupId);
    return group;
  }

  @ApiBearerAuth()
  @Auth()
  @Get('user/:userId')
  async getGroups(@Param('userId') userId: string) {
    const groups = await this.groupService.getGroupsForUser(userId);
    return groups;
  }

  @Get('/join/:inviteCode')
  @ApiBearerAuth()
  @Auth()
  async joinGroup(@Param('inviteCode') inviteCode: string) {
    const group = await this.groupService.joinGroup(inviteCode);

    return {
      message: 'Joined group successfully',
      data: group,
    };
  }

  @Patch('/:groupId')
  @ApiBearerAuth()
  @Auth()
  async updateGroup(@Param('groupId') groupId: string, @Body() body: UpdateGroupDto) {
    const result = await this.groupService.updateGroup(groupId, body);
    return {
      message: 'Group updated successfully',
      data: result,
    };
  }
}
