import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Group } from './entity/group.entity';
import { customAlphabet } from 'nanoid';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(@InjectRepository(Group) private readonly groupRepository: Repository<Group>) {}
  // Create a new group with the given name and associate the creating user
  async createGroup(createGroupDto: CreateGroupDto, userId: string): Promise<Group> {
    const { name } = createGroupDto;

    if (!userId) {
      throw new BadRequestException('User ID is required to create a group');
    }

    const newGroup = await this.groupRepository.create({
      name,
      invite_code: this.generateInviteCode(),
      users: [{ id: userId }],
    });

    if (!newGroup) {
      throw new InternalServerErrorException('Failed to create group');
    }
    return this.groupRepository.save(newGroup);
  }

  // Retrieve all groups that a user belongs to
  async getGroupsForUser(userId: string): Promise<Group[]> {
    const groups = await this.groupRepository.find({
      where: { users: { id: userId } },
    });

    return groups;
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
  async joinGroup(inviteCode: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { invite_code: inviteCode },
    });

    if (!group) {
      throw new BadRequestException('Invalid invite code');
    }

    return group;
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

  // Generate a unique invite code for the group
  private generateInviteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const nanoid = customAlphabet(alphabet, 8);
    return nanoid();
  }
}
