import { Routes } from '@angular/router';
import { DiagramEditorComponent } from './components/diagram-editor/diagram-editor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ViewModeComponent } from './components/view-mode/view-mode.component';
import { OrganizationSettingsComponent } from './components/organization-settings/organization-settings.component';
import { SuperAdminComponent } from './components/super-admin/super-admin.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AuthenticatedLayoutComponent } from './modules/authenticated/authenticated-layout.component';
import { PublicLayoutComponent } from './modules/public/public-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  
  // Public routes (no themes)
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { 
        path: 'login', 
        component: LoginComponent 
      }
    ]
  },
  
  // Authenticated routes (with themes)
  {
    path: '',
    component: AuthenticatedLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent
      },
      { 
        path: 'editor/:projectId', 
        component: DiagramEditorComponent
      },
      { 
        path: 'view-mode/:projectId', 
        component: ViewModeComponent
      },
      { 
        path: 'organization/settings', 
        component: OrganizationSettingsComponent
      },
      { 
        path: 'super-admin', 
        component: SuperAdminComponent,
        canActivate: [SuperAdminGuard]
      }
    ]
  },
  
  { path: '**', component: NotFoundComponent }
];
