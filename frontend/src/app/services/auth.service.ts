import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: string;
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
    isLoading: true,
    error: null
  });

  // Computed signals for reactive state
  user = computed(() => this.authState().user);
  isAuthenticated = computed(() => this.authState().isAuthenticated);
  isLoading = computed(() => this.authState().isLoading);
  error = computed(() => this.authState().error);

  // BehaviorSubject for compatibility with interceptors
  private authSubject = new BehaviorSubject<AuthState>(this.authState());
  public auth$ = this.authSubject.asObservable();
  
  // Guard to prevent duplicate profile loads
  private isLoadingProfile = false;
  private lastLoadedUserId: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private themeService: ThemeService
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      console.log('Initializing authentication...');
      
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
        return;
      }

      if (session?.user) {
        console.log('Found existing session:', session.user.email);
        await this.loadUserProfile(session.user.id);
      } else {
        console.log('No existing session found');
        this.updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: null 
        });
      }

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
        this.lastLoadedUserId = userId;
        this.updateAuthState({ 
          user: data, 
          isAuthenticated: true, 
          isLoading: false, 
          error: null 
        });
        
        // Apply user's preferred theme
        if (data.theme_id) {
          this.themeService.setTheme(data.theme_id);
        }
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
        
        // Temporarily reset guard to allow profile load
        this.lastLoadedUserId = null;
        
        await this.loadUserProfile(data.user.id);
        
        // Navigate after profile is loaded
        console.log('Navigating to dashboard after successful login');
        this.router.navigate(['/dashboard']);
        
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

      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
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
            role: 'admin'
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

  async updateUserTheme(themeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = this.user();
      if (!currentUser) {
        return { success: false, error: 'No authenticated user' };
      }

      const { error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('users')
          .update({ theme_id: themeId })
          .eq('id', currentUser.id);
      });

      if (error) {
        console.error('Error updating user theme:', error);
        return { success: false, error: error.message };
      }

      // Update local user state
      const updatedUser = { ...currentUser, theme_id: themeId };
      this.updateAuthState({ user: updatedUser });

      // Apply the theme
      this.themeService.setTheme(themeId);

      return { success: true };
    } catch (error) {
      console.error('Error updating user theme:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Signing out...');
      
      // Reset guards
      this.lastLoadedUserId = null;
      this.isLoadingProfile = false;
      
      await this.supabase.client.auth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
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

  hasRole(role: string): boolean {
    return this.user()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}

