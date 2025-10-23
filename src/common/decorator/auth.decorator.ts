import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../user/guards/jwt-auth/jwt-auth.guard';

import { Roles } from './role.decorator';
import { RolesGuard } from 'src/guard/role.guard';

export function Auth(roles: string[] = []) {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
}
