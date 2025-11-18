/**
 * Deployment Service
 * Manages connection routing between Master and Slave projects
 * Handles organization context and resource limits
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';
import { 
  Organization, 
  DeploymentConfig, 
  SubscriptionTier,
  SubscriptionStatus,
  DeploymentStrategy,
  canCreateResource,
  getUsagePercentage 
} from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class DeploymentService {
  // Inject SupabaseService to reuse the existing Master client
  private supabaseService = inject(SupabaseService);
  
  // Data client (can be same as master or different slave)
  private dataClient = signal<SupabaseClient | null>(null);
  
  // Current organization context
  private organizationContext = signal<Organization | null>(null);
  
  // Deployment configuration
  private deploymentConfig = signal<DeploymentConfig | null>(null);
  
  // Computed signals
  readonly isInitialized = computed(() => this.dataClient() !== null);
  readonly currentOrg = this.organizationContext.asReadonly();
  readonly currentTier = computed(() => this.organizationContext()?.subscriptionTier || SubscriptionTier.FREE);
  readonly deploymentInfo = this.deploymentConfig.asReadonly();

  constructor() {
    // Master client is now accessed via supabaseService.client
    // No need to create a new instance - fixes NavigatorLock error!
    console.log('✅ DeploymentService initialized - reusing existing Master client');
  }
  
  /**
   * Get the master client (reuses existing instance from SupabaseService)
   */
  private get masterClient(): SupabaseClient {
    return this.supabaseService.client;
  }

  /**
   * Initialize deployment service with user's organization context
   * Works with or without organization - fallback to Master if no org
   */
  async initialize(userId: string, orgId?: string): Promise<void> {
    try {
      console.log('🚀 Initializing deployment service for user:', userId);

      // Get user's organizations from master
      const { data: orgs, error: orgsError } = await this.masterClient
        .rpc('get_user_organizations', { p_user_id: userId });

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        throw orgsError;
      }

      // IMPORTANT: Organization is OPTIONAL
      // User can work without organization (solo mode)
      if (!orgs || orgs.length === 0) {
        console.log('⚠️ No organizations found - using solo mode (Master only)');
        
        // Use Master as data client (no organization)
        this.dataClient.set(this.masterClient);
        this.organizationContext.set(null);
        
        console.log('✅ Initialized in solo mode - all data in Master project');
        return;
      }

      // Use specified org or default to first one
      const selectedOrg = orgId 
        ? orgs.find((o: any) => o.org_id === orgId) 
        : orgs[0];

      if (!selectedOrg) {
        console.warn('Organization not found - using solo mode');
        this.dataClient.set(this.masterClient);
        this.organizationContext.set(null);
        return;
      }

      // Map to Organization model
      const organization: Organization = {
        id: selectedOrg.org_id,
        name: selectedOrg.org_name,
        slug: selectedOrg.org_slug,
        subscriptionTier: selectedOrg.subscription_tier as SubscriptionTier,
        subscriptionStatus: SubscriptionStatus.ACTIVE, // TODO: Get from DB
        subscriptionStartedAt: new Date(),
        deploymentStrategy: selectedOrg.deployment_strategy as DeploymentStrategy,
        limits: {
          maxUsers: selectedOrg.max_users || 3,
          maxProjects: selectedOrg.max_projects || 1,
          maxTablesPerProject: selectedOrg.max_tables_per_project || 5,
          maxRelationshipsPerProject: selectedOrg.max_relationships_per_project || 10
        },
        usage: {
          currentUsers: selectedOrg.current_users || 0,
          currentProjects: selectedOrg.current_projects || 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.organizationContext.set(organization);

      console.log('✅ Organization context loaded:', organization.name, '(', organization.subscriptionTier, ')');

      // Get deployment configuration
      const { data: config, error: configError } = await this.masterClient
        .rpc('get_deployment_config', { p_organization_id: selectedOrg.org_id });

      if (configError) {
        console.error('Error fetching deployment config:', configError);
        throw configError;
      }

      if (!config || config.length === 0) {
        throw new Error('Deployment configuration not found');
      }

      const configData = config[0];
      
      // Access fields using correct naming (RPC returns snake_case)
      const projectRef = configData.supabase_project_ref || configData.project_ref;
      const projectUrl = configData.supabase_project_url || configData.project_url;
      const anonKey = configData.supabase_anon_key || configData.anon_key;
      const schemaName = configData.schema_name;

      // Validate required fields
      if (!projectUrl || !anonKey) {
        console.error('Invalid deployment config - missing required fields:', {
          configData,
          hasProjectUrl: !!projectUrl,
          hasAnonKey: !!anonKey
        });
        throw new Error('Invalid deployment configuration: missing project URL or anon key');
      }

      const deployConfig: DeploymentConfig = {
        id: '',
        organizationId: selectedOrg.org_id,
        supabaseProjectRef: projectRef || '',
        supabaseProjectUrl: projectUrl,
        supabaseAnonKey: anonKey,
        schemaName: schemaName || undefined,
        status: 'active',
        provisionedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.deploymentConfig.set(deployConfig);

      console.log('✅ Deployment config loaded:', deployConfig.supabaseProjectRef);

      // Create data client
      await this.createDataClient(deployConfig, organization);

      console.log('✅ Deployment service initialized successfully');

    } catch (error) {
      console.error('Error initializing deployment service:', error);
      throw error;
    }
  }

  /**
   * Create appropriate data client based on deployment strategy
   */
  private async createDataClient(config: DeploymentConfig, org: Organization): Promise<void> {
    try {
      // Get current session from master
      const { data: sessionData } = await this.masterClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      console.log('🔑 Creating data client for strategy:', org.deploymentStrategy);

      if (org.deploymentStrategy === DeploymentStrategy.SHARED_SCHEMA || 
          org.deploymentStrategy === DeploymentStrategy.DEDICATED_SCHEMA) {
        
        // For FREE/BASIC: Use slave project with JWT from master
        console.log('📊 Creating Slave client:', config.supabaseProjectRef);
        
        const slaveClient = createClient(
          config.supabaseProjectUrl,
          config.supabaseAnonKey,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            },
            auth: {
              persistSession: false, // Don't persist in slave, auth is in master
              autoRefreshToken: false, // Master handles token refresh
              detectSessionInUrl: false,
              storage: undefined // Explicitly no storage to avoid lock conflicts
            }
          }
        );

        this.dataClient.set(slaveClient);
        console.log('✅ Slave client created successfully');
        
      } else if (org.deploymentStrategy === DeploymentStrategy.DEDICATED_PROJECT) {
        
        // For PREMIUM: Use dedicated slave project
        console.log('💎 Creating Premium dedicated client:', config.supabaseProjectRef);
        
        const dedicatedClient = createClient(
          config.supabaseProjectUrl,
          config.supabaseAnonKey,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            },
            auth: {
              persistSession: false, // Don't persist in slave, auth is in master
              autoRefreshToken: false, // Master handles token refresh
              detectSessionInUrl: false,
              storage: undefined // Explicitly no storage to avoid lock conflicts
            }
          }
        );

        this.dataClient.set(dedicatedClient);
        console.log('✅ Premium client created successfully');
      }

    } catch (error) {
      console.error('Error creating data client:', error);
      throw error;
    }
  }

  /**
   * Get master client (for auth and metadata operations)
   */
  getMasterClient(): SupabaseClient {
    return this.masterClient;
  }

  /**
   * Get data client (for CRUD operations on projects/tables)
   */
  getDataClient(): SupabaseClient {
    const client = this.dataClient();
    if (!client) {
      throw new Error('Data client not initialized. Call initialize() first.');
    }
    return client;
  }

  /**
   * Get current organization
   */
  getCurrentOrganization(): Organization | null {
    return this.organizationContext();
  }

  /**
   * Switch to different organization
   */
  async switchOrganization(orgId: string, userId: string): Promise<void> {
    console.log('🔄 Switching organization to:', orgId);
    await this.initialize(userId, orgId);
  }

  /**
   * Check if user is in solo mode (no organization)
   */
  isSoloMode(): boolean {
    return this.organizationContext() === null && this.dataClient() !== null;
  }

  /**
   * Check if user is in organization mode
   */
  isOrganizationMode(): boolean {
    return this.organizationContext() !== null;
  }

  /**
   * Check if organization can create more resources
   * Returns true in solo mode (unlimited)
   */
  canCreateResource(resourceType: 'user' | 'project' | 'table' | 'relationship'): boolean {
    const org = this.organizationContext();
    
    // Solo mode: unlimited resources
    if (!org) {
      console.log('✅ Solo mode: unlimited', resourceType);
      return true;
    }

    return canCreateResource(org, resourceType);
  }

  /**
   * Get usage percentage for a resource
   */
  getUsagePercentage(resourceType: 'user' | 'project'): number {
    const org = this.organizationContext();
    if (!org) return 0;

    return getUsagePercentage(org, resourceType);
  }

  /**
   * Check if approaching limit (default 80%)
   */
  isApproachingLimit(resourceType: 'user' | 'project', threshold: number = 80): boolean {
    return this.getUsagePercentage(resourceType) >= threshold;
  }

  /**
   * Get remaining capacity
   */
  getRemainingCapacity(resourceType: 'user' | 'project'): number {
    const org = this.organizationContext();
    if (!org) return 0;

    switch (resourceType) {
      case 'user':
        return org.limits.maxUsers - org.usage.currentUsers;
      case 'project':
        return org.limits.maxProjects - org.usage.currentProjects;
      default:
        return 0;
    }
  }

  /**
   * Clear all state (for logout)
   */
  clear(): void {
    this.dataClient.set(null);
    this.organizationContext.set(null);
    this.deploymentConfig.set(null);
  }

  /**
   * Refresh organization context (after changes)
   */
  async refresh(userId: string): Promise<void> {
    const currentOrgId = this.organizationContext()?.id;
    if (currentOrgId) {
      await this.initialize(userId, currentOrgId);
    }
  }

  /**
   * Create a new organization for the user
   * Transitions from solo mode to organization mode
   */
  async createOrganization(
    userId: string, 
    orgName: string, 
    slug: string,
    tier: SubscriptionTier = SubscriptionTier.FREE
  ): Promise<string> {
    try {
      console.log('🏢 Creating new organization:', orgName);

      // Call RPC to create organization
      const { data, error } = await this.masterClient
        .rpc('create_organization', {
          p_user_id: userId,
          p_name: orgName,
          p_slug: slug,
          p_tier: tier
        });

      if (error) {
        console.error('Error creating organization:', error);
        throw error;
      }

      const newOrgId = data;
      console.log('✅ Organization created:', newOrgId);

      // Re-initialize with new organization
      await this.initialize(userId, newOrgId);

      return newOrgId;
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Get mode description for UI display
   */
  getModeDescription(): string {
    if (this.isSoloMode()) {
      return 'Solo Mode - Unlimited projects';
    }
    
    const org = this.organizationContext();
    if (org) {
      return `${org.name} - ${org.subscriptionTier.toUpperCase()} tier`;
    }
    
    return 'Not initialized';
  }
}

