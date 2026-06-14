import { SetMetadata } from '@nestjs/common';

export const SUPER_ADMIN_KEY = 'isSuperAdminOnly';
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_KEY, true);
