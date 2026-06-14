import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SUPER_ADMIN_KEY } from './super-admin-only.decorator';
import { Reflector } from '@nestjs/core';
import { Role } from '../common/entity/rolebase';


@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSuperAdminOnly = this.reflector.get<boolean>(
      SUPER_ADMIN_KEY,
      context.getHandler()
    );

    if (!isSuperAdminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== Role.ADMIN) {
      throw new ForbiddenException('Resource access denied. Admin only.');
    }

    return true;
  }
}
