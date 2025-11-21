import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface LimitCheckResult {
  canCreate: boolean;
  current: number;
  max: number;
  tier: string;
  remaining: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanLimitsService {
  private supabase: SupabaseClient;

  constructor() {
    // Create client with unique storage key to avoid NavigatorLock conflicts
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: false, // Don't persist - we use SupabaseService for auth
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined // No storage to avoid lock conflicts
        }
      }
    );
  }

  /**
   * Check if user can create a new project
   */
  async canCreateProject(organizationId: string): Promise<LimitCheckResult> {
    try {
      const { data, error } = await this.supabase.rpc('can_create_project', {
        p_org_id: organizationId
      });

      if (error) {
        console.error('Error checking project limit:', error);
        return {
          canCreate: false,
          current: 0,
          max: 0,
          tier: 'unknown',
          remaining: 0,
          message: 'Could not verify project limit'
        };
      }

      const result = data as any;
      return {
        canCreate: result.can_create,
        current: result.current,
        max: result.max,
        tier: result.tier,
        remaining: result.remaining,
        message: result.can_create 
          ? `You can create ${result.remaining} more project(s)`
          : `Project limit reached (${result.current}/${result.max}). Upgrade to create more projects.`
      };
    } catch (error: any) {
      console.error('Error in canCreateProject:', error);
      return {
        canCreate: false,
        current: 0,
        max: 0,
        tier: 'unknown',
        remaining: 0,
        message: error.message
      };
    }
  }

  /**
   * Check if user can add a table to a project
   */
  async canAddTable(projectId: string): Promise<LimitCheckResult> {
    try {
      const { data, error } = await this.supabase.rpc('can_add_table', {
        p_project_id: projectId
      });

      if (error) {
        console.error('Error checking table limit:', error);
        return {
          canCreate: false,
          current: 0,
          max: 0,
          tier: 'unknown',
          remaining: 0,
          message: 'Could not verify table limit'
        };
      }

      const result = data as any;
      return {
        canCreate: result.can_add,
        current: result.current,
        max: result.max,
        tier: result.tier,
        remaining: result.remaining,
        message: result.can_add
          ? `You can add ${result.remaining} more table(s)`
          : `Table limit reached (${result.current}/${result.max}). Upgrade to add more tables.`
      };
    } catch (error: any) {
      console.error('Error in canAddTable:', error);
      return {
        canCreate: false,
        current: 0,
        max: 0,
        tier: 'unknown',
        remaining: 0,
        message: error.message
      };
    }
  }

  /**
   * Get organization limits info
   */
  async getOrganizationLimits(organizationId: string): Promise<{
    maxProjects: number;
    maxTablesPerProject: number;
    maxUsers: number;
    tier: string;
  } | null> {
    try {
      // Use maybeSingle() instead of single() to handle cases where RLS blocks access
      const { data, error } = await this.supabase
        .from('organizations')
        .select('max_projects, max_tables_per_project, max_users, subscription_tier')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('Error getting organization limits:', error);
        // If RLS blocks access (PGRST116), return null gracefully
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Organization not accessible via RLS, returning null');
          return null;
        }
        return null;
      }

      if (!data) {
        console.warn('⚠️ Organization not found or not accessible');
        return null;
      }

      return {
        maxProjects: data.max_projects,
        maxTablesPerProject: data.max_tables_per_project,
        maxUsers: data.max_users,
        tier: data.subscription_tier
      };
    } catch (error) {
      console.error('Error in getOrganizationLimits:', error);
      return null;
    }
  }

  /**
   * Format tier name for display
   */
  getTierDisplayName(tier: string): string {
    const tierNames: { [key: string]: string } = {
      'free': 'FREE',
      'basic': 'BASIC',
      'premium': 'PREMIUM'
    };
    return tierNames[tier] || tier.toUpperCase();
  }

  /**
   * Get upgrade message
   */
  getUpgradeMessage(tier: string, limitType: 'projects' | 'tables'): string {
    const messages: { [key: string]: { [key: string]: string } } = {
      'free': {
        'projects': 'Upgrade to BASIC (5 projects) or PREMIUM (unlimited)',
        'tables': 'Upgrade to BASIC (50 tables) or PREMIUM (unlimited)'
      },
      'basic': {
        'projects': 'Upgrade to PREMIUM for unlimited projects',
        'tables': 'Upgrade to PREMIUM for unlimited tables'
      }
    };

    return messages[tier]?.[limitType] || 'Upgrade your plan for more resources';
  }
}

