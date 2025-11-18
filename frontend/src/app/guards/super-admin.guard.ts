import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-role.model';

/**
 * Super Admin Guard
 * Only allows access to users with ADMIN role from the database
 */
@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const user = this.authService.user();
    
    if (!user) {
      console.log('❌ Super Admin Guard: No user found');
      this.router.navigate(['/dashboard']);
      return false;
    }

    // Check if user has ADMIN role from database
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAdmin) {
      console.log('❌ Super Admin Guard: User not authorized:', user.email, 'Role:', user.role);
      this.router.navigate(['/dashboard']);
      return false;
    }

    console.log('✅ Super Admin Guard: Access granted to:', user.email);
    return true;
  }

  /**
   * Public method to check if current user is super admin
   * Can be used in components to show/hide super admin features
   */
  isSuperAdminUser(): boolean {
    const user = this.authService.user();
    return user?.role === UserRole.ADMIN;
  }
}

