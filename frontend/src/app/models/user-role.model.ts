export enum UserRole {
  ADMIN = 'admin',
  ORG_ADMIN = 'org_admin',
  CLIENT = 'client'
}

export const USER_ROLES = {
  ADMIN: UserRole.ADMIN,
  ORG_ADMIN: UserRole.ORG_ADMIN,
  CLIENT: UserRole.CLIENT
} as const;

export const ROLE_DISPLAY_NAMES = {
  [UserRole.ADMIN]: 'Super Admin',
  [UserRole.ORG_ADMIN]: 'Organization Admin',
  [UserRole.CLIENT]: 'Client'
} as const;

export const ROLE_DESCRIPTIONS = {
  [UserRole.ADMIN]: 'Full system access across all organizations',
  [UserRole.ORG_ADMIN]: 'Full access within their organization',
  [UserRole.CLIENT]: 'Limited access within their organization'
} as const;

export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 3,
  [UserRole.ORG_ADMIN]: 2,
  [UserRole.CLIENT]: 1
} as const;

/**
 * Check if a role has higher or equal permissions than another
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a role is admin (super admin)
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if a role is organization admin or higher
 */
export function isOrgAdminOrHigher(userRole: UserRole): boolean {
  return hasRolePermission(userRole, UserRole.ORG_ADMIN);
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(userRole: UserRole): boolean {
  return hasRolePermission(userRole, UserRole.ORG_ADMIN);
}

/**
 * Check if a role can manage organization settings
 */
export function canManageOrganization(userRole: UserRole): boolean {
  return hasRolePermission(userRole, UserRole.ORG_ADMIN);
}











