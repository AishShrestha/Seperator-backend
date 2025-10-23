import { Injectable, CanActivate, ExecutionContext, Inject, forwardRef } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    console.log(roles, 'roles');
    if (roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('User:', user);

    if (!user) {
      return false;
    }

    return roles.some((role) => user.role?.includes(role));
  }
}
