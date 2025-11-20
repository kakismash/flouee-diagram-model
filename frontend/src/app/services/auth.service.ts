import { Injectable, signal, computed, inject, Injector, effect } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { DeploymentService } from './deployment.service';
import { ThemeService } from './theme.service';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { UserRole } from '../models/user-role.model';

export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: UserRole;
  theme_id?: string; // User's preferred theme
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false, // Start as not loading to prevent initial authentication
    error: null
  });

  // Computed signals for reactive state
  user = computed(() => this.authState().user);
  isAuthenticated = computed(() => {
    const result = this.hasBeenInitialized && this.authState().isAuthenticated;
    console.log('🔍 isAuthenticated check:', {
      hasBeenInitialized: this.hasBeenInitialized,
      authStateIsAuthenticated: this.authState().isAuthenticated,
      result: result,
      user: this.user()?.email || 'none'
    });
    return result;
  });
  isLoading = computed(() => this.authState().isLoading);
  error = computed(() => this.authState().error);

  // BehaviorSubject for compatibility with interceptors
  private authSubject = new BehaviorSubject<AuthState>(this.authState());
  public auth$ = this.authSubject.asObservable();
  
  // Guard to prevent duplicate profile loads
  private isLoadingProfile = false;
  private lastLoadedUserId: string | null = null;
  private hasBeenInitialized = false;

  private injector = inject(Injector);

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private deploymentService: DeploymentService
  ) {
    // Initialize auth automatically to restore session on page reload
    this.initializeAuth();
  }
  
  /**
   * Get ThemeService instance (lazy to avoid circular dependency)
   */
  private getThemeService(): ThemeService | null {
    try {
      return this.injector.get(ThemeService);
    } catch {
      return null;
    }
  }

  /**
   * Wait for theme to be ready using effect()
   */
  private async waitForThemeReady(themeService: ThemeService): Promise<void> {
    // If already ready, resolve immediately
    if (themeService.isThemeReady$()) {
      return Promise.resolve();
    }

    // Otherwise, wait for isThemeReady$ to become true using effect()
    return new Promise<void>((resolve) => {
      const effectRef = effect(() => {
        if (themeService.isThemeReady$()) {
          resolve();
          if (effectRef) {
            effectRef.destroy();
          }
        }
      }, { injector: this.injector });
    });
  }

  /**
   * Update user theme in database
   */
  async updateUserTheme(themeId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.user();
    if (!user) {
      console.warn('⚠️ Cannot update theme: no authenticated user');
      return { success: false, error: 'No authenticated user' };
    }

    try {
      console.log('💾 Saving theme to database:', themeId);
      
      const { error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('users')
          .update({ theme_id: themeId })
          .eq('id', user.id);
      });

      if (error) {
        console.error('❌ Failed to update user theme:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Theme saved to database successfully');
      
      // Update local user state
      const updatedUser = { ...user, theme_id: themeId };
      this.updateAuthState({ 
        user: updatedUser, 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating user theme:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private async initializeAuth() {
    try {
      console.log('🔐 Initializing authentication...');
      this.updateAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: true, 
        error: null 
      });
      
      // Check for existing session
      const { data: { session }, error } = await this.supabase.client.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: error.message 
        });
        this.hasBeenInitialized = true;
        return;
      }

      if (session?.user) {
        console.log('✅ Found existing session:', session.user.email);
        
        // Initialize deployment service for existing session
        try {
          // No delay needed - deployment service handles initialization properly
          await this.deploymentService.initialize(session.user.id);
          console.log('✅ Deployment service initialized from existing session');
        } catch (deployError) {
          console.warn('⚠️ Could not initialize deployment service:', deployError);
          // Not critical, continue anyway
        }
        
        await this.loadUserProfile(session.user.id);
        
        // Apply theme after loading profile from existing session
        const user = this.user();
        if (user) {
          console.log('🎨 Applying theme for existing session:', user.theme_id || 'default');
          const themeService = this.getThemeService();
          if (themeService) {
            themeService.applyUserTheme(user.theme_id);
            // Wait for theme to be ready
            await this.waitForThemeReady(themeService);
          }
        }
      } else {
        console.log('❌ No existing session found');
        this.updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: null 
        });
      }
      
      this.hasBeenInitialized = true;

      // Listen for auth changes
      this.supabase.client.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event, session?.user?.email);
        
        // Only handle specific events to avoid duplicate loads
        if (event === 'SIGNED_OUT') {
          console.log('Sign out event detected');
          this.lastLoadedUserId = null;
          this.updateAuthState({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          });
          this.router.navigate(['/login']);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('✅ Initial session detected - profile already loaded, just updating state');
          // Profile is already loaded in initializeAuth(), just ensure state is correct
          const currentUser = this.user();
          if (currentUser && currentUser.id === session.user.id) {
            console.log('✅ User profile matches session, ensuring authenticated state');
            this.updateAuthState({ 
              user: currentUser, 
              isAuthenticated: true, 
              isLoading: false, 
              error: null 
            });
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully (no action needed)');
          // Session is automatically updated, profile already loaded
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('User data updated, reloading profile');
          this.lastLoadedUserId = null; // Force reload
          await this.loadUserProfile(session.user.id);
        }
        // Note: SIGNED_IN is handled by signIn() method, not here
        // This prevents duplicate profile loads during login
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
      this.updateAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: 'Failed to initialize authentication' 
      });
    }
  }

  private async loadUserProfile(userId: string) {
    // Guard: Prevent duplicate loads for the same user
    if (this.isLoadingProfile || this.lastLoadedUserId === userId) {
      console.log('⏩ Skipping duplicate profile load for:', userId);
      return;
    }

    try {
      this.isLoadingProfile = true;
      console.log('🔍 Loading user profile for:', userId);
      
      const { data, error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
      });

      if (error) {
        console.error('❌ Error loading user profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('⚠️ This usually means:');
        console.error('   1. RLS policies are blocking the query (recursion error)');
        console.error('   2. User profile doesn\'t exist in "users" table');
        console.error('   3. Permissions are not granted correctly');
        
        this.updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: `Profile load failed: ${error.message}` 
        });
        return;
      }

      if (data) {
        console.log('✅ User profile loaded successfully:', data);
        console.log('🎨 User theme_id from database:', data.theme_id);
        console.log('🎨 User theme_id type:', typeof data.theme_id);
        this.lastLoadedUserId = userId;
        
        // IMPORTANT: Set hasBeenInitialized to true to allow isAuthenticated computed to work
        this.hasBeenInitialized = true;
        
        // Update auth state with user data
        this.updateAuthState({ 
          user: data, 
          isAuthenticated: true, 
          isLoading: false, 
          error: null 
        });
        
        console.log('✅ Auth state updated, waiting for theme service to react...');
        
        // Note: Theme will be applied by ThemeService when it detects user authentication
      } else {
        console.warn('⚠️ No user profile found for:', userId);
        console.warn('User exists in auth.users but not in public.users table');
        console.warn('This means the signup trigger didn\'t work correctly');
        
        this.updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: 'User profile not found - please contact support' 
        });
      }

    } catch (error: any) {
      console.error('💥 Exception loading user profile:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      
      this.updateAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: 'Failed to load user profile' 
      });
    } finally {
      this.isLoadingProfile = false;
    }
  }

  private updateAuthState(newState: Partial<AuthState>) {
    const currentState = this.authState();
    const updatedState = { ...currentState, ...newState };
    
    this.authState.set(updatedState);
    this.authSubject.next(updatedState);
    
    console.log('Auth state updated:', updatedState);
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting to sign in:', email);
      this.updateAuthState({ isLoading: true, error: null });

      // Initialize auth manually if not already done
      if (!this.hasBeenInitialized) {
        await this.initializeAuthManually();
      }

      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        this.updateAuthState({ 
          isLoading: false, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Sign in successful:', data.user.email);
        
        // Initialize deployment service (loads org context and creates data client)
        try {
          console.log('🔄 Initializing deployment service...');
          
          // No delay needed - deployment service handles initialization properly
          await this.deploymentService.initialize(data.user.id);
          console.log('✅ Deployment service initialized');
        } catch (deployError: any) {
          // Handle errors gracefully
          console.error('⚠️ Error initializing deployment service:', deployError);
          // Continue anyway - user might not have organization yet
        }
        
        // Temporarily reset guard to allow profile load
        this.lastLoadedUserId = null;
        
        await this.loadUserProfile(data.user.id);
        
        console.log('✅ User profile loaded and theme will be applied');
        
        // Apply theme IMMEDIATELY after profile load (before navigation)
        const user = this.user();
        if (user) {
          console.log('🎨 Applying theme for user:', user.theme_id || 'default');
          const themeService = this.getThemeService();
          if (themeService) {
            themeService.applyUserTheme(user.theme_id);
            
            // Wait for theme to be ready before navigating
            await this.waitForThemeReady(themeService);
            
          } else {
            console.warn('⚠️ ThemeService not available');
            // No delay needed - continue immediately
          }
        }
        // No delay needed - theme is already applied or not available
        
        // Navigate after theme is ready
        console.log('🚀 Navigating to dashboard');
        await this.router.navigate(['/dashboard']);
        console.log('✅ Login complete');
        
        return { success: true };
      }

      this.updateAuthState({ isLoading: false });
      return { success: false, error: 'Unknown error occurred' };

    } catch (error) {
      console.error('Sign in exception:', error);
      this.updateAuthState({ 
        isLoading: false, 
        error: 'An unexpected error occurred' 
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signUp(email: string, password: string, organizationName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting to sign up:', email);
      this.updateAuthState({ isLoading: true, error: null });

      // Use the current host's full URL for email confirmation redirect
      // This ensures the confirmation link works regardless of where the app is deployed
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      
      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            organization_name: organizationName || 'Default Organization'
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        console.error('Sign up error details:', JSON.stringify(error, null, 2));
        this.updateAuthState({ 
          isLoading: false, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Sign up successful:', data.user.email);
        console.log('User data:', data);
        
        // Create user profile and organization
        await this.createUserProfile(data.user.id, email, organizationName);
        
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };

    } catch (error: any) {
      console.error('Sign up exception:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      this.updateAuthState({ 
        isLoading: false, 
        error: error.message || 'An unexpected error occurred' 
      });
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }

  private async createUserProfile(userId: string, email: string, organizationName?: string) {
    try {
      console.log('Creating user profile and organization...');
      
      // Create organization first
      const { data: orgData, error: orgError } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('organizations')
          .insert({
            name: organizationName || 'Default Organization',
            plan: 'free'
          })
          .select()
          .single();
      });

      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw orgError;
      }

      // Create user profile
      const { data: userData, error: userError } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('users')
          .insert({
            id: userId,
            email: email,
            organization_id: orgData.id,
            role: UserRole.ORG_ADMIN
          })
          .select()
          .single();
      });

      if (userError) {
        console.error('Error creating user profile:', userError);
        throw userError;
      }

      console.log('User profile and organization created successfully');
      await this.loadUserProfile(userId);

    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Signing out...');
      
      // Reset guards
      this.lastLoadedUserId = null;
      this.isLoadingProfile = false;
      this.hasBeenInitialized = false;
      
      // Clear deployment service state
      this.deploymentService.clear();
      console.log('✅ Deployment service cleared');
      
      // Sign out from Supabase (this clears Supabase session storage)
      await this.supabase.client.auth.signOut();
      
      // Clear all localStorage data (theme, cached data, etc.)
      console.log('🧹 Clearing localStorage...');
      localStorage.removeItem('user-theme');
      localStorage.removeItem('flouee-auth-session'); // If any
      // Clear any other app-specific storage
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.startsWith('flouee-') || 
        key.includes('supabase')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ localStorage cleared');
      
      // Update auth state immediately to trigger theme reset
      this.updateAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: null 
      });
      console.log('✅ Auth state cleared');
      
      // No delay needed - theme service reset is synchronous
      
      // Navigate to login
      await this.router.navigate(['/login']);
      console.log('✅ Navigated to login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Manually initialize authentication (call this when needed)
   */
  async initializeAuthManually(): Promise<void> {
    if (!this.hasBeenInitialized) {
      await this.initializeAuth();
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await this.supabase.client.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing token:', error);
        return false;
      }

      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.user();
  }

  getCurrentOrganizationId(): string | null {
    return this.user()?.organization_id || null;
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isOrgAdmin(): boolean {
    return this.hasRole(UserRole.ORG_ADMIN);
  }

  isClient(): boolean {
    return this.hasRole(UserRole.CLIENT);
  }

  isOrgAdminOrHigher(): boolean {
    const userRole = this.user()?.role;
    if (!userRole) return false;
    
    return userRole === UserRole.ADMIN || userRole === UserRole.ORG_ADMIN;
  }

  /**
   * Get current organization from deployment service
   */
  getCurrentOrganization() {
    return this.deploymentService.getCurrentOrganization();
  }

  /**
   * Get current subscription tier
   */
  getCurrentTier() {
    return this.deploymentService.currentTier();
  }

  /**
   * Check if can create resource based on tier limits
   */
  canCreateResource(resourceType: 'user' | 'project' | 'table' | 'relationship'): boolean {
    return this.deploymentService.canCreateResource(resourceType);
  }

  /**
   * Get usage percentage for a resource
   */
  getUsagePercentage(resourceType: 'user' | 'project'): number {
    return this.deploymentService.getUsagePercentage(resourceType);
  }
}

