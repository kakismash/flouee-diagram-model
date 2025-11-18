import { Injectable, inject, signal, effect, OnDestroy, Injector, runInInjectionContext, untracked } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UserPresence {
  user_id: string;
  user_name: string;
  cursor: { x: number; y: number };
  last_seen: string;
}

export interface ActiveUser {
  user_id: string;
  user_name: string;
  cursor: { x: number; y: number };
  last_seen: string;
}

export interface CollaborationState {
  activeUsers: UserPresence[];
  isConnected: boolean;
  lastUpdate: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeCollaborationService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private injector = inject(Injector);
  
  // Signals for reactive state
  public collaborationState = signal<CollaborationState>({
    activeUsers: [],
    isConnected: false,
    lastUpdate: null
  });
  
  private channels = new Map<string, RealtimeChannel>();
  private presenceChannels = new Map<string, RealtimeChannel>();
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  constructor() {
    // Initialize user info using safe injection context
    this.initializeUserEffect();
  }

  /**
   * Initialize user tracking effect safely using injection context
   */
  private initializeUserEffect(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        try {
          // Read user signal - safe to read in effects
          const user = this.auth.user();
          
          // Update user tracking without creating reactive dependencies
          // Use untracked to prevent this from triggering template updates during initialization
          untracked(() => {
            this.currentUserId = user?.id || null;
            this.currentUserName = user?.email || 'Unknown User';
          });
        } catch (error) {
          // Silently handle errors during effect execution
          console.warn('User effect error:', error);
        }
      });
    });
  }

  /**
   * Join a project for real-time collaboration
   */
  async joinProject(projectId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    // Leave previous project if any
    if (this.currentProjectId) {
      await this.leaveProject();
    }

    this.currentProjectId = projectId;
    
    try {
      // Subscribe to project changes
      await this.subscribeToProjectChanges(projectId);
      
      // Subscribe to user presence
      await this.subscribeToUserPresence(projectId);
      
      // Update collaboration state
      this.collaborationState.update(state => ({
        ...state,
        isConnected: true,
        lastUpdate: new Date()
      }));
      
      console.log(`✅ Joined project ${projectId} for real-time collaboration`);
      
    } catch (error) {
      console.error('❌ Failed to join project:', error);
      this.notification.showError('Failed to connect to real-time collaboration');
      throw error;
    }
  }

  /**
   * Leave the current project
   */
  async leaveProject(): Promise<void> {
    if (!this.currentProjectId || !this.currentUserId) {
      return;
    }

    try {
      // Remove user from active users
      await this.removeUserFromProject(this.currentProjectId, this.currentUserId);
      
      // Unsubscribe from channels
      const projectChannel = this.channels.get(this.currentProjectId);
      const presenceChannel = this.presenceChannels.get(this.currentProjectId);
      
      if (projectChannel) {
        await this.supabase.client.removeChannel(projectChannel);
        this.channels.delete(this.currentProjectId);
      }
      
      if (presenceChannel) {
        await this.supabase.client.removeChannel(presenceChannel);
        this.presenceChannels.delete(this.currentProjectId);
      }
      
      // Update collaboration state
      this.collaborationState.update(state => ({
        ...state,
        activeUsers: [],
        isConnected: false,
        lastUpdate: new Date()
      }));
      
      console.log(`✅ Left project ${this.currentProjectId}`);
      
    } catch (error) {
      console.error('❌ Failed to leave project:', error);
    } finally {
      this.currentProjectId = null;
    }
  }

  /**
   * Subscribe to project changes via WebSocket
   */
  private async subscribeToProjectChanges(projectId: string): Promise<void> {
    const channel = this.supabase.client
      .channel(`project-changes:${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      }, (payload) => {
        this.handleProjectUpdate(payload.new);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Subscribed to project changes for ${projectId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to project changes for ${projectId}`);
        }
      });

    this.channels.set(projectId, channel);
  }

  /**
   * Subscribe to user presence
   */
  private async subscribeToUserPresence(projectId: string): Promise<void> {
    const presenceChannel = this.supabase.client
      .channel(`project-presence:${projectId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        this.updateUserPresence(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handleUserJoined(newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handleUserLeft(leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user presence
          await presenceChannel.track({
            user_id: this.currentUserId,
            user_name: this.currentUserName,
            cursor: { x: 0, y: 0 },
            last_seen: new Date().toISOString()
          });
          
          console.log(`👥 Tracking presence for project ${projectId}`);
        }
      });

    this.presenceChannels.set(projectId, presenceChannel);
  }

  /**
   * Handle project updates from other users
   */
  private handleProjectUpdate(project: any): void {
    console.log(`📝 Project updated by ${project.last_modified_by}`);
    
    // Update collaboration state
    this.collaborationState.update(state => ({
      ...state,
      lastUpdate: new Date()
    }));
    
    // Show notification if updated by another user
    if (project.last_modified_by !== this.currentUserId) {
      this.notification.showInfo(`Project updated by another user`);
    }
    
    // Emit custom event for components to listen
    window.dispatchEvent(new CustomEvent('project-updated', {
      detail: { project, updatedBy: project.last_modified_by }
    }));
  }

  /**
   * Update user presence state
   */
  private updateUserPresence(presenceState: any): void {
    const activeUsers: UserPresence[] = [];
    
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        activeUsers.push({
          user_id: presence.user_id,
          user_name: presence.user_name,
          cursor: presence.cursor || { x: 0, y: 0 },
          last_seen: presence.last_seen
        });
      });
    });
    
    this.collaborationState.update(state => ({
      ...state,
      activeUsers,
      lastUpdate: new Date()
    }));
  }

  /**
   * Handle user joined
   */
  private handleUserJoined(newPresences: any[]): void {
    newPresences.forEach(presence => {
      if (presence.user_id !== this.currentUserId) {
        this.notification.showInfo(`${presence.user_name} joined the project`);
      }
    });
  }

  /**
   * Handle user left
   */
  private handleUserLeft(leftPresences: any[]): void {
    leftPresences.forEach(presence => {
      if (presence.user_id !== this.currentUserId) {
        this.notification.showInfo(`${presence.user_name} left the project`);
      }
    });
  }

  /**
   * Update user cursor position
   */
  async updateCursor(x: number, y: number): Promise<void> {
    if (!this.currentProjectId) return;
    
    const presenceChannel = this.presenceChannels.get(this.currentProjectId);
    if (presenceChannel) {
      await presenceChannel.track({
        user_id: this.currentUserId,
        user_name: this.currentUserName,
        cursor: { x, y },
        last_seen: new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast a change to other users
   */
  async broadcastChange(change: any): Promise<void> {
    if (!this.currentProjectId) return;
    
    const channel = this.channels.get(this.currentProjectId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'schema_change',
        payload: {
          change,
          user_id: this.currentUserId,
          user_name: this.currentUserName,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get active users for current project
   */
  getActiveUsers(): UserPresence[] {
    return this.collaborationState().activeUsers;
  }

  /**
   * Check if user is currently active
   */
  isUserActive(userId: string): boolean {
    return this.collaborationState().activeUsers.some(user => user.user_id === userId);
  }

  /**
   * Get collaboration status
   */
  getCollaborationStatus(): CollaborationState {
    return this.collaborationState();
  }

  /**
   * Remove user from project active users (cleanup)
   */
  private async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client.rpc('remove_project_active_user', {
        project_uuid: projectId,
        user_uuid: userId
      });
      
      if (error) {
        console.error('Failed to remove user from active users:', error);
      }
    } catch (error) {
      console.error('Error removing user from active users:', error);
    }
  }

  /**
   * Cleanup on service destroy
   */
  async ngOnDestroy(): Promise<void> {
    if (this.currentProjectId) {
      await this.leaveProject();
    }
  }
}