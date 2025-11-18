import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ProjectService, Project } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { PlanLimitsService } from '../../services/plan-limits.service';
import { ProjectDialogComponent } from '../project-dialog/project-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { RealtimeCountersComponent } from '../realtime-counters/realtime-counters.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    RealtimeCountersComponent
  ],
  template: `
    <div class="dashboard">
      <!-- Dashboard Content -->
      <div class="dashboard-content">
        <div class="header">
          <h1>My Projects</h1>
          <button mat-raised-button color="primary" (click)="createProject()">
            <mat-icon>add</mat-icon>
            New Project
          </button>
        </div>

        <!-- Real-time Counters -->
        <app-realtime-counters 
          *ngIf="authService.user()?.organization_id" 
          [organizationId]="authService.user()!.organization_id">
        </app-realtime-counters>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading projects...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && projects().length === 0" class="empty-state">
          <mat-icon class="empty-icon">folder_open</mat-icon>
          <h2>No projects yet</h2>
          <p>Create your first database schema project</p>
          <button mat-raised-button color="primary" (click)="createProject()">
            <mat-icon>add</mat-icon>
            Create Project
          </button>
        </div>

        <!-- Projects Grid -->
        <div *ngIf="!isLoading() && projects().length > 0" class="projects-grid">
          <mat-card *ngFor="let project of projects()" class="project-card">
            <div class="project-card-header">
              <div class="project-card-icon">
                <mat-icon>account_tree</mat-icon>
              </div>
              <div class="project-card-title-section">
                <h3 class="project-title">{{ project.name }}</h3>
                <p class="project-description">{{ project.description || 'No description' }}</p>
              </div>
              <button mat-icon-button [matMenuTriggerFor]="projectMenu" (click)="$event.stopPropagation()" class="menu-button">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #projectMenu="matMenu">
                <button mat-menu-item (click)="editProject(project); $event.stopPropagation()">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="deleteProject(project); $event.stopPropagation()">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </div>
            
            <div class="project-card-stats">
              <div class="stat-item">
                <mat-icon class="stat-icon">table_chart</mat-icon>
                <div class="stat-content">
                  <span class="stat-value">{{ getTableCount(project) }}</span>
                  <span class="stat-label">tables</span>
                </div>
              </div>
              <div class="stat-item">
                <mat-icon class="stat-icon">access_time</mat-icon>
                <div class="stat-content">
                  <span class="stat-value">{{ formatDate(project.updatedAt) }}</span>
                </div>
              </div>
            </div>
            
            <div class="project-card-actions">
              <button mat-raised-button color="primary" (click)="openProject(project, 'editor'); $event.stopPropagation()" class="action-button">
                <mat-icon>account_tree</mat-icon>
                <span>Editor</span>
              </button>
              <button mat-raised-button color="primary" (click)="openProject(project, 'view'); $event.stopPropagation()" class="action-button">
                <mat-icon>table_chart</mat-icon>
                <span>Tables</span>
              </button>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      height: 100%;
      background: var(--theme-background);
    }

    .dashboard-content {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      background: var(--theme-background);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 500;
      color: var(--theme-text-primary);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      gap: 16px;
    }

    .loading-container p {
      color: var(--theme-text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 64px 32px;
      background: var(--theme-surface);
      border-radius: 8px;
      box-shadow: 0 2px 4px var(--theme-shadow);
    }

    .empty-icon {
      font-size: 96px;
      width: 96px;
      height: 96px;
      color: var(--theme-text-disabled);
      margin-bottom: 16px;
    }

    .empty-state h2 {
      margin: 0 0 8px 0;
      color: var(--theme-text-secondary);
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: var(--theme-text-disabled);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      padding: 0;
    }

    @media (max-width: 768px) {
      .projects-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    @media (min-width: 1200px) {
      .projects-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      }
    }

    .project-card {
      cursor: default;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      background: var(--theme-surface);
      color: var(--theme-text-primary);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--theme-border, rgba(0, 0, 0, 0.12));
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .project-card:hover {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
      border-color: var(--theme-primary, rgba(0, 0, 0, 0.2));
    }

    .project-card-header {
      display: flex;
      align-items: flex-start;
      padding: 20px 20px 16px 20px;
      gap: 16px;
      position: relative;
    }

    .project-card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--theme-primary, #1976d2) 0%, var(--theme-primary-dark, #1565c0) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .project-card-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: white;
    }

    .project-card-title-section {
      flex: 1;
      min-width: 0;
    }

    .project-title {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--theme-text-primary);
      line-height: 1.3;
      word-wrap: break-word;
    }

    .project-description {
      margin: 0;
      font-size: 14px;
      color: var(--theme-text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-button {
      position: absolute;
      top: 12px;
      right: 8px;
      color: var(--theme-text-secondary);
    }

    .menu-button:hover {
      background-color: var(--theme-hover, rgba(0, 0, 0, 0.04));
    }

    .project-card-stats {
      display: flex;
      gap: 24px;
      padding: 0 20px 16px 20px;
      border-bottom: 1px solid var(--theme-border, rgba(0, 0, 0, 0.08));
      margin-bottom: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--theme-text-disabled);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--theme-text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 12px;
      color: var(--theme-text-secondary);
      text-transform: lowercase;
    }

    .project-card-actions {
      padding: 0 20px 20px 20px;
      display: flex;
      gap: 12px;
    }

    .action-button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 500;
      text-transform: none;
      transition: all 0.2s ease;
    }

    .action-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .action-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    /* Material theme overrides */
    .dashboard ::ng-deep .mat-mdc-card {
      background: var(--theme-surface);
      color: var(--theme-text-primary);
    }

    .dashboard ::ng-deep .mat-mdc-menu-panel {
      background: var(--theme-surface);
    }

    .dashboard ::ng-deep .mat-mdc-menu-item {
      color: var(--theme-text-primary);
    }

    .dashboard ::ng-deep .mat-mdc-menu-item:hover {
      background: var(--theme-hover);
    }
  `]
})
export class DashboardComponent implements OnInit {
  projects = signal<Project[]>([]);
  isLoading = signal(true);

  constructor(
    public authService: AuthService,
    private projectService: ProjectService,
    private planLimitsService: PlanLimitsService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadProjects();
  }

  async loadProjects() {
    this.isLoading.set(true);
    try {
      console.log('📊 Dashboard: Starting to load projects...');
      const loadedProjects = await this.projectService.loadProjects();
      console.log('📊 Dashboard: Projects loaded from service:', loadedProjects.length);
      
      const projectsFromSignal = this.projectService.getProjects()();
      console.log('📊 Dashboard: Projects from signal:', projectsFromSignal.length, projectsFromSignal.map(p => ({ id: p.id, name: p.name })));
      
      this.projects.set(projectsFromSignal);
      console.log('📊 Dashboard: Projects signal set, current value:', this.projects().length);
    } catch (error) {
      console.error('Error loading projects:', error);
      this.notificationService.showError('Failed to load projects');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createProject() {
    try {
      // Get current user's organization
      const user = this.authService.user();
      if (!user?.organization_id) {
        this.notificationService.showError('You must belong to an organization to create projects');
        return;
      }

      // Check if user can create project (plan limits)
      const limitCheck = await this.planLimitsService.canCreateProject(user.organization_id);
      
      if (!limitCheck.canCreate) {
        // Show upgrade dialog
        const confirmRef = this.dialog.open(ConfirmDialogComponent, {
          width: '500px',
          data: {
            title: `Project Limit Reached (${limitCheck.current}/${limitCheck.max})`,
            message: `Your ${limitCheck.tier.toUpperCase()} plan allows ${limitCheck.max} project(s). You currently have ${limitCheck.current}.\n\n${this.planLimitsService.getUpgradeMessage(limitCheck.tier, 'projects')}`,
            confirmText: 'Upgrade Plan',
            cancelText: 'Cancel'
          }
        });

        confirmRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            // TODO: Redirect to upgrade page
            this.notificationService.showInfo('Upgrade functionality coming soon!');
          }
        });
        return;
      }

      // Show how many projects remaining
      if (limitCheck.remaining <= 2 && limitCheck.max !== 999999) {
        this.notificationService.showWarning(
          `You can create ${limitCheck.remaining} more project(s) on your ${limitCheck.tier.toUpperCase()} plan`
        );
      }

      // Open create project dialog
      console.log('📝 Opening create project dialog...');
      const dialogRef = this.dialog.open(ProjectDialogComponent, {
        width: '500px',
        data: { mode: 'create' }
      });

      dialogRef.afterClosed().subscribe(async (result) => {
        console.log('📝 Dialog closed with result:', result);
        if (result && result.name) {
          try {
            console.log('📝 Creating project with data:', { name: result.name, description: result.description });
            const project = await this.projectService.createProject(
              result.name,
              result.description
            );
            console.log('✅ Project created successfully:', project.id);
            await this.loadProjects();
            this.notificationService.showSuccess(`Project "${project.name}" created successfully!`);
            this.router.navigate(['/editor', project.id]);
          } catch (error: any) {
            console.error('❌ Error creating project:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            
            // Check if error is due to limit
            if (error.message?.includes('Project limit reached')) {
              this.notificationService.showError('Project limit reached. Please upgrade your plan.');
            } else {
              this.notificationService.showError(`Failed to create project: ${error.message || 'Unknown error'}`);
            }
          }
        } else {
          console.log('📝 Dialog cancelled or invalid result:', result);
        }
      });
    } catch (error: any) {
      console.error('Error in createProject:', error);
      this.notificationService.showError('Failed to check project limits');
    }
  }

  editProject(project: Project) {
    const dialogRef = this.dialog.open(ProjectDialogComponent, {
      width: '500px',
      data: { mode: 'edit', project }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.projectService.updateProject(project.id, {
            name: result.name,
            description: result.description
          });
          await this.loadProjects();
          this.notificationService.showSuccess('Project updated successfully');
        } catch (error) {
          console.error('Error updating project:', error);
          this.notificationService.showError('Failed to update project');
        }
      }
    });
  }

  deleteProject(project: Project) {
    console.log('🗑️ Delete project requested:', project.id);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Project',
        message: `Are you sure you want to delete "${project.name}"? This action cannot be undone and all tables and relationships will be permanently lost.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDangerous: true
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      console.log('🗑️ Delete confirmation:', confirmed);
      if (confirmed) {
        try {
          console.log('🗑️ Deleting project:', project.id);
          await this.projectService.deleteProject(project.id);
          console.log('✅ Project deleted, reloading projects list...');
          await this.loadProjects();
          console.log('✅ Projects list reloaded');
          this.notificationService.showSuccess('Project deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting project:', error);
          this.notificationService.showError('Failed to delete project');
        }
      }
    });
  }

  openProject(project: Project, mode: 'editor' | 'view' = 'editor') {
    if (mode === 'view') {
      this.router.navigate(['/view-mode', project.id]);
    } else {
      this.router.navigate(['/editor', project.id]);
    }
  }

  getTableCount(project: Project): number {
    return project.schemaData?.tables?.length || 0;
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  }

}
