import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, race, timer } from 'rxjs';
import { map, take, filter, mapTo } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🛡️ Auth guard activated for:', state.url);
    
    // Race between auth initialization and timeout
    const authCheck$ = this.authService.auth$.pipe(
      filter(authState => !authState.isLoading),
      take(1)
    );
    
    const timeout$ = timer(5000).pipe(
      mapTo({ isAuthenticated: false, isLoading: false, user: null, error: 'Auth timeout' })
    );
    
    return race(authCheck$, timeout$).pipe(
      map(authState => {
        console.log('✅ Auth guard check complete:', {
          isAuthenticated: authState.isAuthenticated,
          user: authState.user?.email || 'none',
          path: state.url,
          isLoading: authState.isLoading
        });
        
        if (authState.isAuthenticated) {
          return true;
        } else {
          if (authState.error === 'Auth timeout') {
            console.warn('⚠️ Auth initialization timed out, redirecting to login');
          } else {
            console.log('❌ User not authenticated, redirecting to login');
          }
          
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
        }
      })
    );
  }
}

