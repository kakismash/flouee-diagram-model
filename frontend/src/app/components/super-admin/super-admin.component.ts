import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeploymentService } from '../../services/deployment.service';

interface SlaveProjectInfo {
  id: string;
  projectRef: string;
  projectUrl: string;
  strategy: string;
  status: string;
  orgsCount: number;
  capacityPercent: number;
  provisionedAt: Date;
}

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  usersCount: number;
  projectsCount: number;
  slaveProject: string;
  createdAt: Date;
}

interface SystemMetrics {
  totalOrganizations: number;
  totalUsers: number;
  totalProjects: number;
  totalTables: number;
  slaveProjectsCount: number;
  averageCapacity: number;
}

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="super-admin-container">
      <div class="header">
        <h1>🔧 Super Admin Panel</h1>
        <p class="subtitle">Internal dashboard for Flouee management</p>
      </div>

      <mat-tab-group>
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <!-- System Metrics -->
            <div class="metrics-grid">
              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ metrics().totalOrganizations }}</div>
                  <div class="metric-label">
                    <mat-icon>business</mat-icon>
                    Organizations
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ metrics().totalUsers }}</div>
                  <div class="metric-label">
                    <mat-icon>people</mat-icon>
                    Total Users
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ metrics().totalProjects }}</div>
                  <div class="metric-label">
                    <mat-icon>folder</mat-icon>
                    Total Projects
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ metrics().slaveProjectsCount }}</div>
                  <div class="metric-label">
                    <mat-icon>dns</mat-icon>
                    Slave Projects
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Capacity Overview -->
            <mat-card class="capacity-card">
              <mat-card-header>
                <mat-card-title>Overall Capacity</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="capacity-info">
                  <span>Average Capacity Used:</span>
                  <span class="capacity-value">{{ metrics().averageCapacity }}%</span>
                </div>
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="metrics().averageCapacity"
                  [color]="metrics().averageCapacity > 80 ? 'warn' : 'primary'">
                </mat-progress-bar>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Slave Projects Tab -->
        <mat-tab label="Slave Projects">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Slave Supabase Projects</mat-card-title>
                <div class="header-actions">
                  <button mat-raised-button color="primary" (click)="provisionNewSlave()">
                    <mat-icon>add</mat-icon>
                    Provision New Slave
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <table mat-table [dataSource]="slaveProjects()" class="admin-table">
                  <!-- Project Ref -->
                  <ng-container matColumnDef="projectRef">
                    <th mat-header-cell *matHeaderCellDef>Project Ref</th>
                    <td mat-cell *matCellDef="let slave">
                      <code>{{ slave.projectRef }}</code>
                    </td>
                  </ng-container>

                  <!-- Strategy -->
                  <ng-container matColumnDef="strategy">
                    <th mat-header-cell *matHeaderCellDef>Strategy</th>
                    <td mat-cell *matCellDef="let slave">
                      <mat-chip>{{ slave.strategy }}</mat-chip>
                    </td>
                  </ng-container>

                  <!-- Organizations -->
                  <ng-container matColumnDef="orgs">
                    <th mat-header-cell *matHeaderCellDef>Orgs</th>
                    <td mat-cell *matCellDef="let slave">{{ slave.orgsCount }}</td>
                  </ng-container>

                  <!-- Capacity -->
                  <ng-container matColumnDef="capacity">
                    <th mat-header-cell *matHeaderCellDef>Capacity</th>
                    <td mat-cell *matCellDef="let slave">
                      <div class="capacity-cell">
                        <span>{{ slave.capacityPercent }}%</span>
                        <mat-progress-bar 
                          mode="determinate" 
                          [value]="slave.capacityPercent"
                          [color]="slave.capacityPercent > 80 ? 'warn' : 'primary'">
                        </mat-progress-bar>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Status -->
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let slave">
                      <mat-chip [class]="'status-' + slave.status">
                        {{ slave.status }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <!-- Actions -->
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let slave">
                      <button mat-icon-button (click)="viewSlaveDetails(slave)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="slaveColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: slaveColumns;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Organizations Tab -->
        <mat-tab label="Organizations">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>All Organizations</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <table mat-table [dataSource]="organizations()" class="admin-table">
                  <!-- Name -->
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Organization</th>
                    <td mat-cell *matCellDef="let org">
                      <div class="org-cell">
                        <strong>{{ org.name }}</strong>
                        <span class="slug">{{ org.slug }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Tier -->
                  <ng-container matColumnDef="tier">
                    <th mat-header-cell *matHeaderCellDef>Tier</th>
                    <td mat-cell *matCellDef="let org">
                      <mat-chip [class]="'tier-' + org.tier">
                        {{ org.tier.toUpperCase() }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <!-- Users -->
                  <ng-container matColumnDef="users">
                    <th mat-header-cell *matHeaderCellDef>Users</th>
                    <td mat-cell *matCellDef="let org">{{ org.usersCount }}</td>
                  </ng-container>

                  <!-- Projects -->
                  <ng-container matColumnDef="projects">
                    <th mat-header-cell *matHeaderCellDef>Projects</th>
                    <td mat-cell *matCellDef="let org">{{ org.projectsCount }}</td>
                  </ng-container>

                  <!-- Slave Project -->
                  <ng-container matColumnDef="slave">
                    <th mat-header-cell *matHeaderCellDef>Slave Project</th>
                    <td mat-cell *matCellDef="let org">
                      <code class="small-code">{{ org.slaveProject }}</code>
                    </td>
                  </ng-container>

                  <!-- Created -->
                  <ng-container matColumnDef="created">
                    <th mat-header-cell *matHeaderCellDef>Created</th>
                    <td mat-cell *matCellDef="let org">
                      {{ org.createdAt | date:'short' }}
                    </td>
                  </ng-container>

                  <!-- Actions -->
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let org">
                      <button mat-icon-button (click)="viewOrgDetails(org)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="orgColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: orgColumns;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Capacity Monitoring Tab -->
        <mat-tab label="Capacity">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Capacity Monitoring</mat-card-title>
                <mat-card-subtitle>Real-time capacity tracking across all slaves</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="info-text">
                  Monitor capacity usage across all Slave projects. Auto-provisioning triggers at 75% capacity.
                </p>
                
                @for (slave of slaveProjects(); track slave.id) {
                  <div class="capacity-item">
                    <div class="capacity-header">
                      <span class="project-ref">
                        <mat-icon>dns</mat-icon>
                        {{ slave.projectRef }}
                      </span>
                      <span class="capacity-value" 
                            [class.warning]="slave.capacityPercent > 75"
                            [class.critical]="slave.capacityPercent > 90">
                        {{ slave.capacityPercent }}% used
                      </span>
                    </div>
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="slave.capacityPercent"
                      [color]="slave.capacityPercent > 90 ? 'warn' : slave.capacityPercent > 75 ? 'accent' : 'primary'">
                    </mat-progress-bar>
                    <div class="capacity-details">
                      <span>{{ slave.orgsCount }} organizations</span>
                      @if (slave.capacityPercent > 75) {
                        <span class="warning-text">⚠️ Approaching capacity limit</span>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .super-admin-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 32px;
    }

    .subtitle {
      color: #666;
      margin: 8px 0 0 0;
    }

    .tab-content {
      padding: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card mat-card-content {
      text-align: center;
      padding: 24px;
    }

    .metric-value {
      font-size: 48px;
      font-weight: 300;
      color: #1976d2;
    }

    .metric-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #666;
      margin-top: 8px;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-actions {
      margin-left: auto;
    }

    .admin-table {
      width: 100%;
    }

    code {
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .small-code {
      font-size: 11px;
    }

    .org-cell {
      display: flex;
      flex-direction: column;
    }

    .slug {
      font-size: 12px;
      color: #666;
    }

    .tier-free {
      background: #e3f2fd;
      color: #1976d2;
    }

    .tier-basic {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .tier-premium {
      background: #fff3e0;
      color: #e65100;
    }

    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-inactive {
      background: #ffebee;
      color: #c62828;
    }

    .status-migrating {
      background: #fff3e0;
      color: #f57c00;
    }

    .capacity-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .capacity-item {
      margin-bottom: 24px;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;
    }

    .capacity-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .project-ref {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .capacity-value {
      font-weight: 600;
    }

    .capacity-value.warning {
      color: #f57c00;
    }

    .capacity-value.critical {
      color: #d32f2f;
    }

    .capacity-details {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .warning-text {
      color: #f57c00;
      font-weight: 500;
    }

    .info-text {
      color: #666;
      margin-bottom: 24px;
    }

    .capacity-card {
      margin-bottom: 24px;
    }

    .capacity-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .capacity-info .capacity-value {
      font-size: 18px;
      color: #1976d2;
    }
  `]
})
export class SuperAdminComponent implements OnInit {
  slaveProjects = signal<SlaveProjectInfo[]>([]);
  organizations = signal<OrganizationInfo[]>([]);
  metrics = signal<SystemMetrics>({
    totalOrganizations: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalTables: 0,
    slaveProjectsCount: 0,
    averageCapacity: 0
  });

  slaveColumns = ['projectRef', 'strategy', 'orgs', 'capacity', 'status', 'actions'];
  orgColumns = ['name', 'tier', 'users', 'projects', 'slave', 'created', 'actions'];

  constructor(
    private deploymentService: DeploymentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    await Promise.all([
      this.loadSlaveProjects(),
      this.loadOrganizations(),
      this.loadMetrics()
    ]);
  }

  async loadSlaveProjects() {
    try {
      const { data, error } = await this.deploymentService.getMasterClient()
        .from('deployment_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count orgs per slave
      const { data: orgsData } = await this.deploymentService.getMasterClient()
        .from('organizations')
        .select('id, deployment_strategy');

      const orgCounts = new Map<string, number>();
      
      this.slaveProjects.set((data || []).map(config => {
        const orgsCount = orgsData?.filter(o => 
          // Match by deployment strategy for now
          true // TODO: Better matching
        ).length || 0;

        return {
          id: config.id,
          projectRef: config.supabase_project_ref,
          projectUrl: config.supabase_project_url,
          strategy: config.schema_name || 'public',
          status: config.status || 'active',
          orgsCount: orgsCount,
          capacityPercent: 0, // TODO: Calculate from capacity_history
          provisionedAt: new Date(config.provisioned_at || config.created_at)
        };
      }));

    } catch (error) {
      console.error('Error loading slave projects:', error);
      this.snackBar.open('Error loading slave projects', 'Close', { duration: 3000 });
    }
  }

  async loadOrganizations() {
    try {
      const { data, error } = await this.deploymentService.getMasterClient()
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          subscription_tier,
          subscription_status,
          current_users,
          current_projects,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get deployment configs to map slave projects
      const { data: configs } = await this.deploymentService.getMasterClient()
        .from('deployment_configs')
        .select('organization_id, supabase_project_ref');

      const configMap = new Map(configs?.map(c => [c.organization_id, c.supabase_project_ref]) || []);

      this.organizations.set((data || []).map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        tier: org.subscription_tier,
        status: org.subscription_status,
        usersCount: org.current_users || 0,
        projectsCount: org.current_projects || 0,
        slaveProject: configMap.get(org.id) || 'N/A',
        createdAt: new Date(org.created_at)
      })));

    } catch (error) {
      console.error('Error loading organizations:', error);
      this.snackBar.open('Error loading organizations', 'Close', { duration: 3000 });
    }
  }

  async loadMetrics() {
    try {
      // Count total organizations
      const { count: orgsCount } = await this.deploymentService.getMasterClient()
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Count total users (with organizations)
      const { count: usersCount } = await this.deploymentService.getMasterClient()
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('organization_id', 'is', null);

      // Count slave projects
      const { count: slavesCount } = await this.deploymentService.getMasterClient()
        .from('deployment_configs')
        .select('*', { count: 'exact', head: true });

      this.metrics.set({
        totalOrganizations: orgsCount || 0,
        totalUsers: usersCount || 0,
        totalProjects: 0, // TODO: Count from slave projects
        totalTables: 0, // TODO: Count from slave projects
        slaveProjectsCount: slavesCount || 0,
        averageCapacity: 0 // TODO: Calculate average
      });

    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }

  provisionNewSlave() {
    this.snackBar.open('Provision new slave feature coming soon!', 'Close', { duration: 3000 });
  }

  viewSlaveDetails(slave: SlaveProjectInfo) {
    this.snackBar.open(`Viewing details for ${slave.projectRef}`, 'Close', { duration: 3000 });
  }

  viewOrgDetails(org: OrganizationInfo) {
    this.snackBar.open(`Viewing details for ${org.name}`, 'Close', { duration: 3000 });
  }
}

