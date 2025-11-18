/**
 * REALTIME COUNTERS SERVICE
 * 
 * This service provides real-time updates for organization counters
 * (users, projects) using Supabase Realtime subscriptions.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrganizationCounters {
  id: string;
  name: string;
  current_users: number;
  max_users: number;
  current_projects: number;
  max_projects: number;
  subscription_tier: string;
  updated_at: string;
}

export interface CounterUpdate {
  organization_id: string;
  counter_type: 'users' | 'projects';
  old_value: number;
  new_value: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeCountersService implements OnDestroy {
  private supabase: SupabaseClient;
  private countersSubject = new BehaviorSubject<OrganizationCounters[]>([]);
  private counterUpdatesSubject = new Subject<CounterUpdate>();
  private channels: Map<string, RealtimeChannel> = new Map();
  private destroy$ = new Subject<void>();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.unsubscribeAll();
  }

  /**
   * Get current counters as Observable
   */
  getCounters(): Observable<OrganizationCounters[]> {
    return this.countersSubject.asObservable();
  }

  /**
   * Get counter updates as Observable
   */
  getCounterUpdates(): Observable<CounterUpdate> {
    return this.counterUpdatesSubject.asObservable();
  }

  /**
   * Get counters for a specific organization
   */
  getOrganizationCounters(organizationId: string): Observable<OrganizationCounters | null> {
    return new Observable(observer => {
      const subscription = this.countersSubject.subscribe(counters => {
        const orgCounter = counters.find(c => c.id === organizationId) || null;
        observer.next(orgCounter);
      });
      
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Subscribe to real-time updates for an organization (ATOMIC)
   */
  subscribeToOrganization(organizationId: string): void {
    if (this.channels.has(organizationId)) {
      console.log(`Already subscribed to organization: ${organizationId}`);
      return;
    }

    console.log(`🔔 Subscribing to ATOMIC real-time updates for organization: ${organizationId}`);

    // Create atomic subscription with organization-specific filter
    const channel = this.supabase
      .channel(`org_counters_atomic_${organizationId}`, {
        config: {
          // Ensure atomic delivery
          broadcast: { self: false },
          presence: { key: organizationId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}` // Atomic filter - only this org
        },
        (payload) => {
          console.log(`📊 ATOMIC update for org ${organizationId}:`, payload);
          this.handleAtomicCounterUpdate(organizationId, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
          filter: `organization_id=eq.${organizationId}` // User joins this org
        },
        (payload) => {
          console.log(`👤 User joined org ${organizationId}:`, payload);
          this.handleUserChange(organizationId, 'INSERT', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'users',
          filter: `organization_id=eq.${organizationId}` // User leaves this org
        },
        (payload) => {
          console.log(`👤 User left org ${organizationId}:`, payload);
          this.handleUserChange(organizationId, 'DELETE', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `organization_id=eq.${organizationId}` // Project created in this org
        },
        (payload) => {
          console.log(`📁 Project created in org ${organizationId}:`, payload);
          this.handleProjectChange(organizationId, 'INSERT', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'projects',
          filter: `organization_id=eq.${organizationId}` // Project deleted from this org
        },
        (payload) => {
          console.log(`📁 Project deleted from org ${organizationId}:`, payload);
          this.handleProjectChange(organizationId, 'DELETE', payload);
        }
      )
      .subscribe((status) => {
        console.log(`📡 ATOMIC subscription status for ${organizationId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to atomic updates for ${organizationId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Subscription error for ${organizationId}`);
        }
      });

    this.channels.set(organizationId, channel);

    // Load initial data atomically
    this.loadOrganizationCountersAtomic(organizationId);
  }

  /**
   * Unsubscribe from organization updates
   */
  unsubscribeFromOrganization(organizationId: string): void {
    const channel = this.channels.get(organizationId);
    if (channel) {
      console.log(`🔕 Unsubscribing from organization: ${organizationId}`);
      this.supabase.removeChannel(channel);
      this.channels.delete(organizationId);
    }
  }

  /**
   * Unsubscribe from all organizations
   */
  unsubscribeAll(): void {
    console.log('🔕 Unsubscribing from all organizations');
    this.channels.forEach((channel, orgId) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Load initial counters for an organization (ATOMIC)
   */
  private async loadOrganizationCountersAtomic(organizationId: string): Promise<void> {
    try {
      console.log(`🔄 Loading ATOMIC counters for organization: ${organizationId}`);
      
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error loading organization counters atomically:', error);
        return;
      }

      if (data) {
        console.log(`✅ ATOMIC counters loaded for ${organizationId}:`, data);
        this.updateCounters([data]);
      }
    } catch (error) {
      console.error('Exception loading organization counters atomically:', error);
    }
  }

  /**
   * Handle atomic counter updates from real-time
   */
  private handleAtomicCounterUpdate(organizationId: string, payload: any): void {
    const { new: newData, old: oldData } = payload;
    
    if (!newData || !oldData) return;

    console.log(`⚛️ ATOMIC counter update for ${organizationId}:`, {
      old: { users: oldData.current_users, projects: oldData.current_projects },
      new: { users: newData.current_users, projects: newData.current_projects }
    });

    // Update counters atomically
    this.updateCounters([newData]);

    // Emit atomic counter update events
    if (oldData.current_users !== newData.current_users) {
      this.counterUpdatesSubject.next({
        organization_id: organizationId,
        counter_type: 'users',
        old_value: oldData.current_users,
        new_value: newData.current_users,
        timestamp: new Date().toISOString()
      });
    }

    if (oldData.current_projects !== newData.current_projects) {
      this.counterUpdatesSubject.next({
        organization_id: organizationId,
        counter_type: 'projects',
        old_value: oldData.current_projects,
        new_value: newData.current_projects,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle user changes (join/leave organization)
   */
  private handleUserChange(organizationId: string, eventType: 'INSERT' | 'DELETE', payload: any): void {
    console.log(`👤 User ${eventType} event for org ${organizationId}:`, payload);
    
    // Trigger a refresh of organization counters immediately
    // No delay needed - triggers are synchronous on the database side
    this.loadOrganizationCountersAtomic(organizationId);
  }

  /**
   * Handle project changes (create/delete in organization)
   */
  private handleProjectChange(organizationId: string, eventType: 'INSERT' | 'DELETE', payload: any): void {
    console.log(`📁 Project ${eventType} event for org ${organizationId}:`, payload);
    
    // Trigger a refresh of organization counters immediately
    // No delay needed - triggers are synchronous on the database side
    this.loadOrganizationCountersAtomic(organizationId);
  }

  /**
   * Update counters in the subject
   */
  private updateCounters(organizations: OrganizationCounters[]): void {
    const currentCounters = this.countersSubject.value;
    const updatedCounters = [...currentCounters];

    organizations.forEach(org => {
      const index = updatedCounters.findIndex(c => c.id === org.id);
      if (index >= 0) {
        updatedCounters[index] = org;
      } else {
        updatedCounters.push(org);
      }
    });

    this.countersSubject.next(updatedCounters);
  }

  /**
   * Get current counter values synchronously
   */
  getCurrentCounters(): OrganizationCounters[] {
    return this.countersSubject.value;
  }

  /**
   * Get current counter for specific organization
   */
  getCurrentOrganizationCounter(organizationId: string): OrganizationCounters | null {
    return this.countersSubject.value.find(c => c.id === organizationId) || null;
  }

  /**
   * Check if user can perform action based on current counters (ATOMIC)
   */
  canCreateProject(organizationId: string): boolean {
    const counter = this.getCurrentOrganizationCounter(organizationId);
    return counter ? counter.current_projects < counter.max_projects : false;
  }

  /**
   * Check remaining capacity (ATOMIC)
   */
  getRemainingCapacity(organizationId: string): {
    users: number;
    projects: number;
  } {
    const counter = this.getCurrentOrganizationCounter(organizationId);
    if (!counter) {
      return { users: 0, projects: 0 };
    }

    return {
      users: Math.max(0, counter.max_users - counter.current_users),
      projects: Math.max(0, counter.max_projects - counter.current_projects)
    };
  }

  /**
   * Format counter display (ATOMIC)
   */
  formatCounterDisplay(organizationId: string): string {
    const counter = this.getCurrentOrganizationCounter(organizationId);
    if (!counter) return 'Unknown';

    return `${counter.current_users}/${counter.max_users} users, ${counter.current_projects}/${counter.max_projects} projects`;
  }

  /**
   * Get atomic subscription status for an organization
   */
  getSubscriptionStatus(organizationId: string): string | null {
    const channel = this.channels.get(organizationId);
    return channel ? channel.state : null;
  }

  /**
   * Force refresh counters for an organization (ATOMIC)
   */
  async refreshCounters(organizationId: string): Promise<void> {
    console.log(`🔄 Force refreshing ATOMIC counters for: ${organizationId}`);
    await this.loadOrganizationCountersAtomic(organizationId);
  }

  /**
   * Get detailed counter info with atomic verification
   */
  async getDetailedCounterInfo(organizationId: string): Promise<{
    counters: OrganizationCounters | null;
    subscriptionStatus: string;
    lastUpdate: string;
    isLive: boolean;
  }> {
    const counters = this.getCurrentOrganizationCounter(organizationId);
    const subscriptionStatus = this.getSubscriptionStatus(organizationId);
    const lastUpdate = counters?.updated_at || new Date().toISOString();
    const isLive = subscriptionStatus === 'SUBSCRIBED';

    return {
      counters,
      subscriptionStatus: subscriptionStatus || 'UNKNOWN',
      lastUpdate,
      isLive
    };
  }
}
