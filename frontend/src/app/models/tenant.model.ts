export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
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
