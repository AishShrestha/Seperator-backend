import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanService } from './plan.service';

@ApiTags('plan')
@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @ApiOperation({ summary: 'List all subscription plans' })
  async listPlans() {
    const plans = await this.planService.findAll();
    return {
      message: 'Plans retrieved successfully',
      plans,
    };
  }
}
