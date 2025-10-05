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
import { ProjectDialogComponent } from '../project-dialog/project-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

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
    MatProgressSpinnerModule
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
          <mat-card *ngFor="let project of projects()" class="project-card" (click)="openProject(project)">
            <mat-card-header>
              <mat-icon mat-card-avatar>account_tree</mat-icon>
              <mat-card-title>{{ project.name }}</mat-card-title>
              <mat-card-subtitle>{{ project.description || 'No description' }}</mat-card-subtitle>
              
              <button mat-icon-button [matMenuTriggerFor]="projectMenu" (click)="$event.stopPropagation()">
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
            </mat-card-header>
            
            <mat-card-content>
              <div class="project-stats">
                <div class="stat">
                  <mat-icon>table_chart</mat-icon>
                  <span>{{ getTableCount(project) }} tables</span>
                </div>
                <div class="stat">
                  <mat-icon>access_time</mat-icon>
                  <span>{{ formatDate(project.updatedAt) }}</span>
                </div>
              </div>
            </mat-card-content>
            
            <mat-card-actions>
              <button mat-button color="primary" (click)="openProject(project); $event.stopPropagation()">
                <mat-icon>open_in_new</mat-icon>
                Open
              </button>
            </mat-card-actions>
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
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .project-card {
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      background: var(--theme-surface);
      color: var(--theme-text-primary);
    }

    .project-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px var(--theme-shadow);
    }

    .project-card mat-card-header {
      margin-bottom: 16px;
    }

    .project-card mat-card-title {
      color: var(--theme-text-primary);
    }

    .project-card mat-card-subtitle {
      color: var(--theme-text-secondary);
    }

    .project-card mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--theme-primary);
    }

    .project-stats {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-text-secondary);
      font-size: 14px;
    }

    .stat mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--theme-text-disabled);
    }

    mat-card-actions {
      padding: 8px 16px;
    }

    /* Material theme overrides */
    .dashboard ::ng-deep .mat-mdc-card {
      background: var(--theme-surface);
      color: var(--theme-text-primary);
    }

    .dashboard ::ng-deep .mat-mdc-card-title {
      color: var(--theme-text-primary);
    }

    .dashboard ::ng-deep .mat-mdc-card-subtitle {
      color: var(--theme-text-secondary);
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

    .dashboard ::ng-deep .mat-mdc-button {
      color: var(--theme-text-primary);
    }

    .dashboard ::ng-deep .mat-mdc-raised-button {
      background: var(--theme-primary);
      color: var(--theme-on-primary);
    }

    .dashboard ::ng-deep .mat-mdc-raised-button:hover {
      background: var(--theme-primary-dark);
    }
  `]
})
export class DashboardComponent implements OnInit {
  projects = signal<Project[]>([]);
  isLoading = signal(true);

  constructor(
    public authService: AuthService,
    private projectService: ProjectService,
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
      await this.projectService.loadProjects();
      this.projects.set(this.projectService.getProjects()());
    } catch (error) {
      console.error('Error loading projects:', error);
      this.notificationService.showError('Failed to load projects');
    } finally {
      this.isLoading.set(false);
    }
  }

  createProject() {
    const dialogRef = this.dialog.open(ProjectDialogComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const project = await this.projectService.createProject(
            result.name,
            result.description
          );
          await this.loadProjects();
          this.router.navigate(['/editor', project.id]);
        } catch (error) {
          console.error('Error creating project:', error);
        }
      }
    });
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
      if (confirmed) {
        try {
          await this.projectService.deleteProject(project.id);
          await this.loadProjects();
          this.notificationService.showSuccess('Project deleted successfully');
        } catch (error) {
          console.error('Error deleting project:', error);
          this.notificationService.showError('Failed to delete project');
        }
      }
    });
  }

  openProject(project: Project) {
    this.router.navigate(['/editor', project.id]);
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
