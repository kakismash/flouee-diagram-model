export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

import { UserRole } from './user-role.model';

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  themeId?: string; // User's preferred theme
  createdAt: Date;
  updatedAt: Date;
}
