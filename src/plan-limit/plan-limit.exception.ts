 import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Structured error response when a plan limit is reached.
 * Clients can use code, upgrade_required, and current_plan for UX (e.g. upgrade prompts).
 */
export interface PlanLimitErrorPayload {
  code: 'PLAN_LIMIT_REACHED';
  upgrade_required: boolean;
  current_plan: string;
  message: string;
}

export class PlanLimitException extends HttpException {
  constructor(payload: PlanLimitErrorPayload) {
    super(
      {
        ...payload,
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
