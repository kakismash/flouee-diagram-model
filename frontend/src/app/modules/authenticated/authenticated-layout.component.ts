import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SuperAdminGuard } from '../../guards/super-admin.guard';
import { ThemeSelectorComponent } from '../../components/theme-selector/theme-selector.component';
import { ToolbarDataService } from '../../services/toolbar-data.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, ThemeSelectorComponent, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, MatDividerModule, MatChipsModule],
  template: `
    <div class="authenticated-container">
      <!-- Shared Toolbar -->
      <mat-toolbar color="primary" class="shared-toolbar" *ngIf="isAuthenticated">
        <!-- Back button for non-dashboard routes -->
        <button *ngIf="shouldShowBackButton()" 
                mat-icon-button 
                matTooltip="Back to Dashboard"
                matTooltipPosition="below"
                (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        
        <span class="app-title">Flouee Diagram Model</span>
        
        <!-- View Mode specific content -->
        <div *ngIf="isViewModeRoute()" class="view-mode-info">
          <div class="toolbar-stats">
            <div class="toolbar-stat-item">
              <mat-icon class="toolbar-stat-icon">table_chart</mat-icon>
              <div class="toolbar-stat-content">
                <span class="toolbar-stat-number">{{ toolbarData.tableCount }}</span>
                <span class="toolbar-stat-label">Tables</span>
              </div>
            </div>
            <div class="toolbar-stat-item">
              <mat-icon class="toolbar-stat-icon">link</mat-icon>
              <div class="toolbar-stat-content">
                <span class="toolbar-stat-number">{{ toolbarData.relationshipCount }}</span>
                <span class="toolbar-stat-label">Relationships</span>
              </div>
            </div>
            <div class="toolbar-stat-item">
              <mat-icon class="toolbar-stat-icon">data_object</mat-icon>
              <div class="toolbar-stat-content">
                <span class="toolbar-stat-number">{{ toolbarData.totalRecords }}</span>
                <span class="toolbar-stat-label">Records</span>
              </div>
            </div>
          </div>
          
          <div class="toolbar-status">
            <mat-chip
              [color]="toolbarData.isValid ? 'primary' : 'warn'"
              class="status-chip">
              {{ toolbarData.isValid ? 'Valid' : 'Invalid' }}
            </mat-chip>
            <mat-chip
              *ngIf="toolbarData.errors && toolbarData.errors! > 0"
              color="warn"
              class="status-chip error-chip">
              {{ toolbarData.errors }} Error{{ toolbarData.errors! > 1 ? 's' : '' }}
            </mat-chip>
            <mat-chip
              *ngIf="toolbarData.warnings && toolbarData.warnings! > 0"
              class="status-chip warning-chip">
              {{ toolbarData.warnings }} Warning{{ toolbarData.warnings! > 1 ? 's' : '' }}
            </mat-chip>
          </div>
          
          <button mat-icon-button 
                  (click)="viewModeAction('export')" 
                  matTooltip="Export Schema"
                  matTooltipPosition="below"
                  class="download-button">
            <mat-icon>download</mat-icon>
          </button>
        </div>
        
        <!-- Editor-specific buttons -->
        <div *ngIf="isEditorRoute()" class="editor-buttons">
          <button mat-icon-button 
                  [matMenuTriggerFor]="fileMenu" 
                  matTooltip="File"
                  matTooltipPosition="below">
            <mat-icon>folder</mat-icon>
          </button>
          <mat-menu #fileMenu="matMenu">
            <button mat-menu-item>
              <mat-icon>add</mat-icon>
              <span>New Diagram</span>
            </button>
            <button mat-menu-item>
              <mat-icon>folder_open</mat-icon>
              <span>Open</span>
            </button>
            <button mat-menu-item>
              <mat-icon>save</mat-icon>
              <span>Save</span>
            </button>
          </mat-menu>

          <button mat-icon-button 
                  [matMenuTriggerFor]="editMenu" 
                  matTooltip="Edit"
                  matTooltipPosition="below">
            <mat-icon>edit</mat-icon>
          </button>
          <mat-menu #editMenu="matMenu">
            <button mat-menu-item (click)="editorAction('addTable')">
              <mat-icon>table_chart</mat-icon>
              <span>Add Table</span>
            </button>
            <button mat-menu-item (click)="editorAction('deleteTable')">
              <mat-icon>delete</mat-icon>
              <span>Delete Table</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="editorAction('addRelationship')">
              <mat-icon>timeline</mat-icon>
              <span>Add Relationship</span>
            </button>
          </mat-menu>

          <button mat-icon-button 
                  (click)="editorAction('generateSQL')" 
                  matTooltip="Generate SQL"
                  matTooltipPosition="below">
            <mat-icon>code</mat-icon>
          </button>
          
          <button mat-icon-button 
                  (click)="editorAction('viewMode')" 
                  matTooltip="View Mode"
                  matTooltipPosition="below">
            <mat-icon>visibility</mat-icon>
          </button>
        </div>
        
        <span class="spacer"></span>
        
        <span class="user-email">{{ authService.user()?.email }}</span>
        
        <!-- Theme Selector in Toolbar -->
        <app-theme-selector class="toolbar-theme-selector"></app-theme-selector>
        
        <button mat-icon-button 
                [matMenuTriggerFor]="userMenu" 
                matTooltip="User Menu"
                matTooltipPosition="below">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item routerLink="/organization/settings">
            <mat-icon>business</mat-icon>
            <span>Organization Settings</span>
          </button>
          @if (isSuperAdmin()) {
            <mat-divider></mat-divider>
            <button mat-menu-item routerLink="/super-admin">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>Super Admin Panel</span>
            </button>
          }
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>
      
      <!-- Main Content -->
      <div class="main-content">
        <router-outlet />
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/themes.css', './authenticated-layout.component.scss']
})
export class AuthenticatedLayoutComponent {
  currentRoute = signal<string>('');

  constructor(
    public authService: AuthService,
    private router: Router,
    private toolbarDataService: ToolbarDataService,
    private superAdminGuard: SuperAdminGuard
  ) {
    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });
    
    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  isEditorRoute(): boolean {
    return this.currentRoute().includes('/editor/');
  }

  isViewModeRoute(): boolean {
    return this.currentRoute().includes('/view-mode/');
  }

  isSuperAdminRoute(): boolean {
    return this.currentRoute().includes('/super-admin');
  }

  isOrganizationSettingsRoute(): boolean {
    return this.currentRoute().includes('/organization/settings');
  }

  shouldShowBackButton(): boolean {
    return this.isEditorRoute() || 
           this.isViewModeRoute() || 
           this.isSuperAdminRoute() || 
           this.isOrganizationSettingsRoute();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  editorAction(action: string) {
    // Emit custom event that the editor can listen to
    const event = new CustomEvent('editor-action', { 
      detail: { action },
      bubbles: true 
    });
    window.dispatchEvent(event);
  }

  viewModeAction(action: string) {
    // Emit custom event that the view mode can listen to
    const event = new CustomEvent('view-mode-action', { 
      detail: { action },
      bubbles: true 
    });
    window.dispatchEvent(event);
  }

  // Use getter instead of computed to avoid initialization issues
  get toolbarData() {
    return this.toolbarDataService.data();
  }

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  isSuperAdmin(): boolean {
    return this.superAdminGuard.isSuperAdminUser();
  }

  logout() {
    this.authService.signOut();
  }
}
