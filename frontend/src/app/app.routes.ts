import { Routes } from '@angular/router';
import { DiagramEditorComponent } from './components/diagram-editor/diagram-editor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ViewModeComponent } from './components/view-mode/view-mode.component';
import { AuthGuard } from './guards/auth.guard';
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
      }
    ]
  },
  
  { path: '**', redirectTo: '/dashboard' }
];
