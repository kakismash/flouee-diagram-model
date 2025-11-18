/**
 * Subscription and Tier Management Models
 * Defines the subscription tiers, limits, and deployment strategies
 */

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  TRIAL = 'trial'
}

export enum DeploymentStrategy {
  SHARED_SCHEMA = 'shared_schema',       // FREE tier
  DEDICATED_SCHEMA = 'dedicated_schema', // BASIC tier
  DEDICATED_PROJECT = 'dedicated_project' // PREMIUM tier
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxProjects: number;
  maxTablesPerProject: number;
  maxRelationshipsPerProject: number;
}

export interface SubscriptionUsage {
  currentUsers: number;
  currentProjects: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  website?: string;
  
  // Subscription info
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  subscriptionStartedAt: Date;
  
  // Deployment
  deploymentStrategy: DeploymentStrategy;
  
  // Limits
  limits: SubscriptionLimits;
  
  // Usage
  usage: SubscriptionUsage;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface DeploymentConfig {
  id: string;
  organizationId: string;
  
  // Target Slave project info
  supabaseProjectRef: string;
  supabaseProjectUrl: string;
  supabaseAnonKey: string;
  
  // For shared deployments
  schemaName?: string;
  
  // Status
  status: 'active' | 'migrating' | 'inactive';
  provisionedAt: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

import { UserRole } from './user-role.model';

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface CapacityReport {
  deploymentId: string;
  projectRef: string;
  organizationsCount: number;
  tablesAllocated: number;
  tablesMax: number;
  capacityPercentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'full';
}

export interface ProvisioningAlert {
  id: string;
  alertType: 'capacity_warning' | 'capacity_critical' | 'provision_required';
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  message: string;
  details?: any;
  status: 'pending' | 'acknowledged' | 'resolved' | 'ignored';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tier configurations with default limits and pricing
 */
export const TIER_CONFIGS: Record<SubscriptionTier, {
  tier: SubscriptionTier;
  name: string;
  deploymentStrategy: DeploymentStrategy;
  limits: SubscriptionLimits;
  pricing: { monthlyPrice: number; setupFee: number };
  features: string[];
}> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    deploymentStrategy: DeploymentStrategy.SHARED_SCHEMA,
    limits: {
      maxUsers: 3,
      maxProjects: 1,
      maxTablesPerProject: 5,
      maxRelationshipsPerProject: 10
    },
    pricing: {
      monthlyPrice: 0,
      setupFee: 0
    },
    features: [
      '3 collaborators',
      '1 project',
      '5 tables per project',
      'Community support',
      'Basic export'
    ]
  },
  [SubscriptionTier.BASIC]: {
    tier: SubscriptionTier.BASIC,
    name: 'Basic',
    deploymentStrategy: DeploymentStrategy.DEDICATED_SCHEMA,
    limits: {
      maxUsers: 15, // 10 editors + 5 viewers
      maxProjects: 5,
      maxTablesPerProject: 50,
      maxRelationshipsPerProject: 100
    },
    pricing: {
      monthlyPrice: 15,
      setupFee: 0
    },
    features: [
      '15 users (10 editors + 5 viewers)',
      '5 projects',
      '50 tables per project',
      'Unlimited custom views',
      'Advanced export',
      'Email support (48h)',
      '90-day history'
    ]
  },
  [SubscriptionTier.PREMIUM]: {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    deploymentStrategy: DeploymentStrategy.DEDICATED_PROJECT,
    limits: {
      maxUsers: 999999,
      maxProjects: 999999,
      maxTablesPerProject: 999999,
      maxRelationshipsPerProject: 999999
    },
    pricing: {
      monthlyPrice: 50,
      setupFee: 0
    },
    features: [
      'Unlimited users',
      'Unlimited projects',
      'Unlimited tables',
      'Dedicated Supabase project',
      'Dedicated performance',
      'Priority support (4h)',
      'Unlimited history',
      'Full API access',
      'White-label option',
      'SSO/SAML'
    ]
  }
};

/**
 * Helper function to get tier config by tier name
 */
export function getTierConfig(tier: SubscriptionTier) {
  return TIER_CONFIGS[tier];
}

/**
 * Helper function to check if organization can create more resources
 */
export function canCreateResource(
  org: Organization,
  resourceType: 'user' | 'project' | 'table' | 'relationship'
): boolean {
  switch (resourceType) {
    case 'user':
      return org.usage.currentUsers < org.limits.maxUsers;
    case 'project':
      return org.usage.currentProjects < org.limits.maxProjects;
    default:
      return true; // Table and relationship limits checked per-project
  }
}

/**
 * Helper function to get usage percentage
 */
export function getUsagePercentage(
  org: Organization,
  resourceType: 'user' | 'project'
): number {
  switch (resourceType) {
    case 'user':
      return Math.round((org.usage.currentUsers / org.limits.maxUsers) * 100);
    case 'project':
      return Math.round((org.usage.currentProjects / org.limits.maxProjects) * 100);
    default:
      return 0;
  }
}

/**
 * Helper function to determine if approaching limit
 */
export function isApproachingLimit(
  org: Organization,
  resourceType: 'user' | 'project',
  threshold: number = 80
): boolean {
  return getUsagePercentage(org, resourceType) >= threshold;
}

