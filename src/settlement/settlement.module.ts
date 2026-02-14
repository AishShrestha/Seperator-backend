import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './entity/settlement.entity';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { Group } from '../group/entity/group.entity';
import { GroupMember } from '../group/entity/group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settlement, Group, GroupMember]),
  ],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService, TypeOrmModule],
})
export class SettlementModule {}
