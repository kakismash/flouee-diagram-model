import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DeploymentService } from './deployment.service';
import { NotificationService } from './notification.service';

export interface SyncStatus {
  synced: boolean;
  master: { version: number; hash: string };
  slave: { version: number; hash: string; status: string; last_synced: string | null };
  needs_reconciliation: boolean;
  version_diff: number;
  schema: string;
}

/**
 * Service to verify and reconcile schema synchronization between Master and Slave
 */
@Injectable({
  providedIn: 'root'
})
export class SchemaReconciliationService {
  private supabase = inject(SupabaseService);
  private deployment = inject(DeploymentService);
  private notification = inject(NotificationService);

  /**
   * Verify if project schema is synced between Master and Slave
   */
  async verifySyncStatus(projectId: string): Promise<SyncStatus | null> {
    const org = this.deployment.getCurrentOrganization();
    if (!org) {
      console.error('No organization context');
      return null;
    }

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'verify-schema-sync',
        {
          body: {
            organization_id: org.id,
            project_id: projectId
          }
        }
      );

      if (error) {
        console.error('Error calling verify-schema-sync:', error);
        return null;
      }

      if (!data.success) {
        console.error('verify-schema-sync failed:', data.error);
        return null;
      }

      return data as SyncStatus;
    } catch (error) {
      console.error('Exception in verifySyncStatus:', error);
      return null;
    }
  }

  /**
   * Check sync status and show notification if out of sync
   */
  async checkAndNotify(projectId: string): Promise<boolean> {
    try {
      const status = await this.verifySyncStatus(projectId);

      if (!status) {
        // Could not verify (maybe functions not configured)
        return true; // Assume synced to avoid false warnings
      }

      if (!status.synced) {
        console.warn(`⚠️ Project out of sync: Master v${status.master.version}, Slave v${status.slave.version}`);
        
        this.notification.showWarning(
          `Schema out of sync: Master v${status.master.version}, Slave v${status.slave.version}. ` +
          `Version difference: ${status.version_diff}`
        );
        
        return false;
      }

      console.log('✅ Project schema is synced');
      return true;
    } catch (error) {
      console.error('Error checking sync:', error);
      return true; // Assume synced on error
    }
  }

  /**
   * Auto-reconcile schema differences (when implemented)
   * For now, just verifies
   */
  async reconcile(projectId: string): Promise<any> {
    const org = this.deployment.getCurrentOrganization();
    if (!org) throw new Error('No organization context');

    // TODO: Implement when reconcile-schema Edge Function is ready
    console.log('Reconciliation not yet implemented - manual sync required');
    
    this.notification.showInfo(
      'Auto-reconciliation coming soon. Please verify schema manually for now.'
    );

    return { success: false, message: 'Not yet implemented' };
  }
}

