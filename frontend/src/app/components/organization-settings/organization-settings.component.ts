import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule} from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeploymentService } from '../../services/deployment.service';
import { AuthService } from '../../services/auth.service';
import { UserRole, ROLE_DISPLAY_NAMES } from '../../models/user-role.model';
import { 
  Organization, 
  SubscriptionTier, 
  getTierConfig,
  getUsagePercentage,
  canCreateResource 
} from '../../models/subscription.model';

interface OrganizationMember {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
  joinedAt: Date;
  lastActive?: Date;
}

@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="org-settings-container">
      <div class="header">
        <h1>Organization Settings</h1>
        @if (org) {
          <div class="org-info">
            <h2>{{ org!.name }}</h2>
            <span class="tier-badge" [class]="'tier-' + org!.subscriptionTier">
              {{ getTierName() }}
            </span>
          </div>
        }
      </div>

      <!-- Usage Overview -->
      <mat-card class="usage-card">
        <mat-card-header>
          <mat-card-title>Resource Usage</mat-card-title>
          <mat-card-subtitle>Current usage vs. plan limits</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (org) {
            <!-- Users -->
            <div class="usage-item">
              <div class="usage-header">
                <span class="usage-label">
                  <mat-icon>people</mat-icon>
                  Users
                </span>
                <span class="usage-count">
                  {{ org!.usage.currentUsers }} / {{ org!.limits.maxUsers }}
                </span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="getUserPercentage()"
                [color]="getUserPercentage() > 80 ? 'warn' : 'primary'">
              </mat-progress-bar>
            </div>

            <!-- Projects -->
            <div class="usage-item">
              <div class="usage-header">
                <span class="usage-label">
                  <mat-icon>folder</mat-icon>
                  Projects
                </span>
                <span class="usage-count">
                  {{ org!.usage.currentProjects }} / {{ org!.limits.maxProjects }}
                </span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="getProjectPercentage()"
                [color]="getProjectPercentage() > 80 ? 'warn' : 'primary'">
              </mat-progress-bar>
            </div>

            <!-- Tables per project limit (info only) -->
            <div class="usage-item info-only">
              <div class="usage-header">
                <span class="usage-label">
                  <mat-icon>table_chart</mat-icon>
                  Tables per Project
                </span>
                <span class="usage-count">
                  Limit: {{ org!.limits.maxTablesPerProject }}
                </span>
              </div>
            </div>

            <!-- Upgrade notice -->
            @if (canUpgrade()) {
              <div class="upgrade-notice">
                <mat-icon>info</mat-icon>
                <span>Need more resources? Upgrade to unlock higher limits!</span>
                <button mat-raised-button color="primary" (click)="showUpgradeOptions()">
                  Upgrade Plan
                </button>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>

      <!-- Members Management -->
      <mat-card class="members-card">
        <mat-card-header>
          <mat-card-title>Team Members</mat-card-title>
          <mat-card-subtitle>
            Manage users and their roles
          </mat-card-subtitle>
          <div class="header-actions">
            <button mat-raised-button color="primary" 
                    (click)="inviteUser()"
                    [disabled]="!canAddUser()">
              <mat-icon>person_add</mat-icon>
              Invite User
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          @if (members().length > 0) {
            <table mat-table [dataSource]="members()" class="members-table">
              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let member">
                  <div class="member-info">
                    <span class="member-email">{{ member.email }}</span>
                    @if (member.name) {
                      <span class="member-name">{{ member.name }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let member">
                  <mat-chip [class]="'role-' + member.role">
                    {{ getRoleLabel(member.role) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let member">
                  <mat-chip [class]="'status-' + member.status">
                    {{ getStatusLabel(member.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Joined Column -->
              <ng-container matColumnDef="joined">
                <th mat-header-cell *matHeaderCellDef>Joined</th>
                <td mat-cell *matCellDef="let member">
                  {{ member.joinedAt | date:'short' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let member">
                  @if (canManageMember(member)) {
                    <button mat-icon-button [matMenuTriggerFor]="memberMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #memberMenu="matMenu">
                      @if (member.role !== UserRole.ADMIN) {
                        <button mat-menu-item (click)="changeRole(member, UserRole.ORG_ADMIN)">
                          <mat-icon>admin_panel_settings</mat-icon>
                          <span>Make Org Admin</span>
                        </button>
                        <button mat-menu-item (click)="changeRole(member, UserRole.CLIENT)">
                          <mat-icon>person</mat-icon>
                          <span>Make Client</span>
                        </button>
                        <mat-divider></mat-divider>
                      }
                      @if (member.status === 'invited') {
                        <button mat-menu-item (click)="resendInvitation(member)">
                          <mat-icon>send</mat-icon>
                          <span>Resend Invitation</span>
                        </button>
                      }
                      @if (member.role !== UserRole.ADMIN) {
                        <button mat-menu-item (click)="removeMember(member)" class="danger">
                          <mat-icon>delete</mat-icon>
                          <span>Remove User</span>
                        </button>
                      }
                    </mat-menu>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          } @else {
            <div class="empty-state">
              <mat-icon>people_outline</mat-icon>
              <p>No team members yet</p>
              <button mat-raised-button color="primary" (click)="inviteUser()">
                Invite First Member
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Plan Details -->
      <mat-card class="plan-card">
        <mat-card-header>
          <mat-card-title>Plan Details</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (tierConfig) {
            <div class="plan-info">
              <div class="plan-row">
                <span class="label">Current Plan:</span>
                <span class="value">{{ tierConfig!.name }}</span>
              </div>
              <div class="plan-row">
                <span class="label">Monthly Price:</span>
                <span class="value">\${{ tierConfig!.pricing.monthlyPrice }}</span>
              </div>
              <div class="plan-row">
                <span class="label">Deployment:</span>
                <span class="value">{{ getDeploymentLabel() }}</span>
              </div>
              
              <div class="features">
                <h4>Included Features:</h4>
                <ul>
                  @for (feature of tierConfig!.features; track feature) {
                    <li>{{ feature }}</li>
                  }
                </ul>
              </div>

              @if (org!.subscriptionTier !== 'premium') {
                <button mat-raised-button color="primary" (click)="showUpgradeOptions()">
                  Upgrade Plan
                </button>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .org-settings-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .org-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .org-info h2 {
      margin: 0;
      font-size: 32px;
    }

    .tier-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
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

    mat-card {
      margin-bottom: 24px;
    }

    .usage-item {
      margin-bottom: 24px;
    }

    .usage-item:last-of-type {
      margin-bottom: 0;
    }

    .usage-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .usage-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .usage-count {
      font-weight: 600;
      color: #666;
    }

    .usage-item.info-only mat-progress-bar {
      display: none;
    }

    .upgrade-notice {
      margin-top: 24px;
      padding: 16px;
      background: #fff3e0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .upgrade-notice mat-icon {
      color: #f57c00;
    }

    .upgrade-notice span {
      flex: 1;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-actions {
      margin-left: auto;
    }

    .members-table {
      width: 100%;
    }

    .member-info {
      display: flex;
      flex-direction: column;
    }

    .member-email {
      font-weight: 500;
    }

    .member-name {
      font-size: 12px;
      color: #666;
    }

    .role-owner {
      background: #fff3e0;
      color: #e65100;
    }

    .role-admin {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .role-editor {
      background: #e3f2fd;
      color: #1976d2;
    }

    .role-viewer {
      background: #f5f5f5;
      color: #666;
    }

    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-invited {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-suspended {
      background: #ffebee;
      color: #c62828;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
    }

    .empty-state p {
      color: #999;
      margin: 16px 0;
    }

    .danger {
      color: #d32f2f;
    }

    .plan-info {
      padding: 16px 0;
    }

    .plan-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .plan-row .label {
      color: #666;
    }

    .plan-row .value {
      font-weight: 600;
    }

    .features {
      margin-top: 24px;
    }

    .features h4 {
      margin-bottom: 12px;
      color: #666;
    }

    .features ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .features li {
      padding: 6px 0;
      padding-left: 24px;
      position: relative;
    }

    .features li:before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #4caf50;
      font-weight: bold;
    }
  `]
})
export class OrganizationSettingsComponent implements OnInit {
  // Make UserRole available in template
  UserRole = UserRole;
  
  members = signal<OrganizationMember[]>([]);
  
  // Use getters instead of computed to avoid initialization issues
  get org() {
    return this.deploymentService.getCurrentOrganization();
  }
  
  get tierConfig() {
    const organization = this.org;
    return organization ? getTierConfig(organization.subscriptionTier) : null;
  }

  displayedColumns = ['email', 'role', 'status', 'joined', 'actions'];

  constructor(
    private deploymentService: DeploymentService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadMembers();
  }

  async loadMembers() {
    // TODO: Load from API
    // For now, mock data
    const currentUser = this.authService.user();
    if (currentUser) {
      this.members.set([{
        id: currentUser.id,
        email: currentUser.email || 'user@example.com',
        name: 'You',
        role: UserRole.ADMIN,
        status: 'active',
        joinedAt: new Date(),
        lastActive: new Date()
      }]);
    }
  }

  getUserPercentage(): number {
    const organization = this.org;
    return organization ? getUsagePercentage(organization, 'user') : 0;
  }

  getProjectPercentage(): number {
    const organization = this.org;
    return organization ? getUsagePercentage(organization, 'project') : 0;
  }

  canUpgrade(): boolean {
    return this.org?.subscriptionTier !== SubscriptionTier.PREMIUM;
  }

  canAddUser(): boolean {
    const organization = this.org;
    return organization ? canCreateResource(organization, 'user') : false;
  }

  getTierName(): string {
    return this.tierConfig?.name || '';
  }

  getDeploymentLabel(): string {
    const organization = this.org;
    if (!organization) return '';
    
    switch (organization.deploymentStrategy) {
      case 'shared_schema': return 'Shared Schema';
      case 'dedicated_schema': return 'Dedicated Schema';
      case 'dedicated_project': return 'Dedicated Project';
      default: return '';
    }
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_DISPLAY_NAMES[role];
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  canManageMember(member: OrganizationMember): boolean {
    // Only owners and admins can manage members
    const currentUser = this.authService.user();
    if (!currentUser) return false;
    
    const currentMember = this.members().find(m => m.id === currentUser.id);
    return currentMember?.role === UserRole.ADMIN || currentMember?.role === UserRole.ORG_ADMIN;
  }

  inviteUser() {
    // TODO: Open invite dialog
    this.snackBar.open('Invite user feature coming soon!', 'Close', { duration: 3000 });
  }

  changeRole(member: OrganizationMember, newRole: UserRole) {
    // TODO: Call API to change role
    const roleDisplayName = ROLE_DISPLAY_NAMES[newRole];
    this.snackBar.open(`Changed ${member.email} to ${roleDisplayName}`, 'Close', { duration: 3000 });
  }

  resendInvitation(member: OrganizationMember) {
    // TODO: Resend invitation
    this.snackBar.open(`Invitation resent to ${member.email}`, 'Close', { duration: 3000 });
  }

  removeMember(member: OrganizationMember) {
    // TODO: Confirm and remove member
    this.snackBar.open(`Removed ${member.email}`, 'Close', { duration: 3000 });
  }

  showUpgradeOptions() {
    // TODO: Open upgrade dialog
    this.snackBar.open('Upgrade options coming soon!', 'Close', { duration: 3000 });
  }
}

