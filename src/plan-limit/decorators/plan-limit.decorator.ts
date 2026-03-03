import { SetMetadata } from '@nestjs/common';
import { PlanLimitAction } from '../enums/plan-limit-action.enum';

export const PLAN_LIMIT_KEY = 'planLimit';

/**
 * Decorator to mark an endpoint as subject to plan limit enforcement.
 * The guard reads this metadata and delegates validation to PlanLimitService.
 */
export const PlanLimit = (action: PlanLimitAction) =>
  SetMetadata(PLAN_LIMIT_KEY, action);
