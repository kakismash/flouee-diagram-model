import { Routes } from '@angular/router';
import { DiagramEditorComponent } from './components/diagram-editor/diagram-editor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ViewModeComponent } from './components/view-mode/view-mode.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'editor/:projectId', 
    component: DiagramEditorComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'view-mode/:projectId', 
    component: ViewModeComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { path: '**', redirectTo: '/dashboard' }
];
