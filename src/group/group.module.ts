import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { Group } from './entity/group.entity';
import { GroupMember } from './entity/group-member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupRolesGuard } from './guards/group-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember])],
  controllers: [GroupController],
  providers: [GroupService, GroupRolesGuard],
  exports: [GroupService, GroupRolesGuard, TypeOrmModule],
})
export class GroupModule {}
