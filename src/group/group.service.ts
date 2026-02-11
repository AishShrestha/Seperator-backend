import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember) private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  // Create a new group with the given name and associate the creating user as OWNER
  async createGroup(createGroupDto: CreateGroupDto, userId: string): Promise<Group & { userRole: GroupRole }> {
    const { name } = createGroupDto;

    if (!userId) {
      throw new BadRequestException('User ID is required to create a group');
    }

    // Create the group
    const newGroup = this.groupRepository.create({
      name,
      invite_code: this.generateInviteCode(),
    });

    const savedGroup = await this.groupRepository.save(newGroup);

    if (!savedGroup) {
      throw new InternalServerErrorException('Failed to create group');
    }

    // Add the creator as OWNER
    const membership = this.groupMemberRepository.create({
      user_id: userId,
      group_id: savedGroup.id,
      role: GroupRole.OWNER,
    });

    await this.groupMemberRepository.save(membership);

    return { ...savedGroup, userRole: GroupRole.OWNER };
  }

  // Retrieve all groups that a user belongs to (with their role)
  async getGroupsForUser(userId: string): Promise<(Group & { userRole: GroupRole })[]> {
    const memberships = await this.groupMemberRepository.find({
      where: { user_id: userId },
      relations: ['group'],
    });

    return memberships.map((m) => ({
      ...m.group,
      userRole: m.role,
    }));
  }

  // Update group details such as name
  async updateGroup(groupId: string, updateData: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepository.preload({
      id: groupId,
      ...updateData,
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return await this.groupRepository.save(group);
  }

  // Allow a user to join a group using an invite code
  async joinGroup(inviteCode: string, userId: string): Promise<Group & { userRole: GroupRole }> {
    const group = await this.groupRepository.findOne({
      where: { invite_code: inviteCode },
    });

    if (!group) {
      throw new BadRequestException('Invalid invite code');
    }

    // Check if user is already a member
    const existingMembership = await this.groupMemberRepository.findOne({
      where: { user_id: userId, group_id: group.id },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already a member of this group');
    }

    // Add user as MEMBER
    const membership = this.groupMemberRepository.create({
      user_id: userId,
      group_id: group.id,
      role: GroupRole.MEMBER,
    });

    await this.groupMemberRepository.save(membership);

    return { ...group, userRole: GroupRole.MEMBER };
  }

  // Retrieve a group by its unique group ID
  async getGroupByGroupId(groupId: string): Promise<Group> {
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
  }

  // Get a group with members
  async getGroupWithMembers(groupId: string): Promise<Group & { members: GroupMember[] }> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group as Group & { members: GroupMember[] };
  }

  // Get user's role in a group
  async getUserRoleInGroup(userId: string, groupId: string): Promise<GroupRole | null> {
    const membership = await this.groupMemberRepository.findOne({
      where: { user_id: userId, group_id: groupId },
    });

    return membership?.role || null;
  }

  // Update a member's role (only OWNER can do this)
  async updateMemberRole(groupId: string, targetUserId: string, newRole: GroupRole): Promise<GroupMember> {
    const membership = await this.groupMemberRepository.findOne({
      where: { user_id: targetUserId, group_id: groupId },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }

    // Cannot change OWNER role
    if (membership.role === GroupRole.OWNER) {
      throw new BadRequestException('Cannot change the role of the group owner');
    }

    // Cannot promote to OWNER
    if (newRole === GroupRole.OWNER) {
      throw new BadRequestException('Cannot promote a member to owner');
    }

    membership.role = newRole;
    return this.groupMemberRepository.save(membership);
  }

  // Remove a member from the group
  async removeMember(groupId: string, targetUserId: string): Promise<void> {
    const membership = await this.groupMemberRepository.findOne({
      where: { user_id: targetUserId, group_id: groupId },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }

    if (membership.role === GroupRole.OWNER) {
      throw new BadRequestException('Cannot remove the group owner');
    }

    await this.groupMemberRepository.remove(membership);
  }

  // Generate a unique invite code for the group
  private generateInviteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const nanoid = customAlphabet(alphabet, 8);
    return nanoid();
  }
}
