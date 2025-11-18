import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { GlobalLoadingComponent } from './components/global-loading/global-loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, GlobalLoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private currentRoute = signal<string>(this.router.url);
  
  constructor() {
    // Track route changes for login detection
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });
  }
  
  // Show loading until theme is ready AND user is authenticated (if needed)
  isLoading = computed(() => {
    const isThemeLoading = this.themeService.isThemeLoading$();
    const isThemeReady = this.themeService.isThemeReady$();
    const isAuthenticated = this.authService.isAuthenticated();
    const isLoading = this.authService.isLoading();
    const isLoginRoute = this.currentRoute().includes('/login');
    
    // Show loading if:
    // 1. Auth is still loading, OR
    // 2. User is authenticated but theme is not ready yet (only if not on login route), OR
    // 3. Theme is still loading (only if not on login route)
    // Note: On login route, theme ready is set immediately, so no blocking
    return isLoading || (isAuthenticated && !isThemeReady && !isLoginRoute) || (isThemeLoading && !isLoginRoute);
  });
  
  // Dynamic loading text based on what's happening
  loadingText = computed(() => {
    if (this.authService.isLoading()) {
      return 'Authenticating...';
    }
    if (this.themeService.isThemeLoading$()) {
      return 'Loading theme...';
    }
    return 'Loading...';
  });
  
  loadingSubtitle = computed(() => {
    const isAuthenticated = this.authService.isAuthenticated();
    if (isAuthenticated && this.themeService.isThemeLoading$()) {
      return 'Applying your preferences...';
    }
    return '';
  });
}
