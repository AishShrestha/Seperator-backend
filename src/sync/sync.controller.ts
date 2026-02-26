import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService, SyncPlansResponse } from './sync.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('plans')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Sync plans from config to DB and Stripe (admin only)' })
  async syncPlans(): Promise<SyncPlansResponse> {
    return this.syncService.syncAllWithStripe();
  }
}
