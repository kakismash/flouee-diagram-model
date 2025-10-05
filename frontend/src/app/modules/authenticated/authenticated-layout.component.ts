import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
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
  imports: [RouterOutlet, CommonModule, ThemeSelectorComponent, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, MatDividerModule, MatChipsModule],
  template: `
    <div class="authenticated-container">
      <!-- Shared Toolbar -->
      <mat-toolbar color="primary" class="shared-toolbar" *ngIf="isAuthenticated()">
        <!-- Back button for editor and view-mode -->
        <button *ngIf="isEditorRoute() || isViewModeRoute()" 
                mat-icon-button 
                matTooltip="Back to Dashboard" 
                (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        
        <span class="app-title">Flouee Diagram Model</span>
        
        <!-- View Mode specific content -->
        <div *ngIf="isViewModeRoute()" class="view-mode-info">
          <mat-chip-set class="toolbar-chips">
            <mat-chip>{{ toolbarData().tableCount }} Tables</mat-chip>
            <mat-chip>{{ toolbarData().relationshipCount }} Relationships</mat-chip>
            <mat-chip [color]="toolbarData().isValid ? 'primary' : 'warn'">
              {{ toolbarData().isValid ? 'Valid' : 'Invalid' }}
            </mat-chip>
          </mat-chip-set>
          
          <button mat-icon-button (click)="viewModeAction('export')" matTooltip="Export Schema">
            <mat-icon>download</mat-icon>
          </button>
        </div>
        
        <!-- Editor-specific buttons -->
        <div *ngIf="isEditorRoute()" class="editor-buttons">
          <button mat-icon-button [matMenuTriggerFor]="fileMenu" matTooltip="File">
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

          <button mat-icon-button [matMenuTriggerFor]="editMenu" matTooltip="Edit">
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

          <button mat-icon-button (click)="editorAction('generateSQL')" matTooltip="Generate SQL">
            <mat-icon>code</mat-icon>
          </button>
          
          <button mat-icon-button (click)="editorAction('viewMode')" matTooltip="View Mode">
            <mat-icon>visibility</mat-icon>
          </button>
        </div>
        
        <span class="spacer"></span>
        
        <span class="user-email">{{ authService.user()?.email }}</span>
        
        <!-- Theme Selector in Toolbar -->
        <app-theme-selector class="toolbar-theme-selector"></app-theme-selector>
        
        <button mat-icon-button [matMenuTriggerFor]="userMenu" matTooltip="User Menu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
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
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentRoute = signal<string>('');

  constructor(
    public authService: AuthService,
    private router: Router,
    private toolbarDataService: ToolbarDataService
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

  toolbarData = computed(() => this.toolbarDataService.data());

  logout() {
    this.authService.signOut();
  }
}
