import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, switchMap, filter, take, mergeMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for Supabase auth endpoints (they handle their own auth)
    if (req.url.includes('/auth/v1/')) {
      return next.handle(req);
    }

    // Add auth token to Supabase requests
    return from(this.authService.getAccessToken()).pipe(
      mergeMap(token => {
        const authReq = this.addAuthHeader(req, token);
        return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              return this.handle401Error(authReq, next);
            }
            return throwError(() => error);
          })
        );
      })
    );
  }

  private addAuthHeader(req: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (token) {
      const user = this.authService.getCurrentUser();
      
      return req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'apikey': token, // Supabase also needs this
          ...(user?.organization_id && { 'X-Organization-ID': user.organization_id })
        }
      });
    }
    
    return req;
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = false;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshToken()).pipe(
        switchMap((success: boolean) => {
          this.isRefreshing = false;
          
          if (success) {
            this.refreshTokenSubject.next(success);
            
            // Get new token and retry request
            return from(this.authService.getAccessToken()).pipe(
              switchMap(newToken => {
                const authReq = this.addAuthHeader(req, newToken);
                return next.handle(authReq);
              })
            );
          } else {
            // Refresh failed, redirect to login
            console.error('Token refresh failed, signing out');
            this.authService.signOut();
            return throwError(() => new Error('Authentication failed'));
          }
        }),
        catchError((error) => {
          this.isRefreshing = false;
          console.error('401 error handler failed:', error);
          this.authService.signOut();
          return throwError(() => error);
        })
      );
    }

    // Wait for the refresh to complete
    return this.refreshTokenSubject.pipe(
      filter(result => result !== null),
      take(1),
      switchMap(() => {
        return from(this.authService.getAccessToken()).pipe(
          switchMap(newToken => {
            const authReq = this.addAuthHeader(req, newToken);
            return next.handle(authReq);
          })
        );
      })
    );
  }
}
