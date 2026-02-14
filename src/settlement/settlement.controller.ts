import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../common/decorator/auth.decorator';
import { SettlementService } from './settlement.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('group/:groupId')
  @ApiBearerAuth()
  @Auth()
  async getSettlementsByGroup(
    @Param('groupId') groupId: string,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const data = await this.settlementService.getSettlementsByGroupId(
      groupId,
      userId,
    );
    return {
      message: 'Settlements retrieved successfully',
      data,
    };
  }

  @Post()
  @ApiBearerAuth()
  @Auth()
  async createSettlement(
    @Body() dto: CreateSettlementDto,
    @Req() req: { user?: { id: string } },
  ) {
    const payerId = req?.user?.id;
    if (!payerId) {
      throw new UnauthorizedException();
    }
    const settlement = await this.settlementService.createSettlement(dto, payerId);
    return {
      message: 'Settlement added successfully',
      data: settlement,
    };
  }
}
