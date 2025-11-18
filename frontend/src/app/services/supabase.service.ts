import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _supabase: SupabaseClient | null = null;
  private requestQueue: (() => Promise<void>)[] = [];
  private maxConcurrentRequests = 3;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize client in constructor to avoid template access issues
    // Client will be lazily initialized on first access
  }

  private async initializeClient(): Promise<void> {
    if (this._supabase) {
      return; // Already initialized
    }

    if (this.initializationPromise) {
      return this.initializationPromise; // Already initializing
    }

    this.initializationPromise = new Promise<void>((resolve, reject) => {
      // Initialize immediately - no need for setTimeout
      // Angular is already ready when services are constructed
      try {
        // Validate environment is available
        if (!environment) {
          throw new Error('Environment configuration is not available');
        }
        
        if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
          throw new Error('Supabase configuration is missing in environment');
        }
        
        this._supabase = createClient(
          environment.supabaseUrl,
          environment.supabaseAnonKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              flowType: 'pkce',
              storage: window.localStorage,
              storageKey: 'flouee-auth-session'
            },
            global: {
              headers: {
                'X-Client-Info': 'flouee-diagram-model'
              }
            }
          }
        );
        resolve();
      } catch (error) {
        console.error('Error creating Supabase client:', error);
        this.initializationPromise = null;
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  get client(): SupabaseClient {
    if (!this._supabase) {
      // Synchronous fallback - initialize synchronously if not already initialized
      // This maintains backward compatibility
      if (!environment) {
        throw new Error('Environment configuration is not available');
      }
      
      if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
        throw new Error('Supabase configuration is missing in environment');
      }
      
      this._supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
            storage: window.localStorage,
            storageKey: 'flouee-auth-session'
          },
          global: {
            headers: {
              'X-Client-Info': 'flouee-diagram-model'
            }
          }
        }
      );
    }
    return this._supabase;
  }

  async getClient(): Promise<SupabaseClient> {
    await this.initializeClient();
    return this.client;
  }

  // Queue management to prevent concurrent request issues
  async executeRequest<T>(request: () => Promise<T>, retries: number = 3): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        let attempts = 0;
        
        while (attempts < retries) {
          try {
            // Execute request directly - Supabase client and browser handle timeouts
            // No need for custom timeout - requests will fail naturally on network issues
            const result = await request();
            resolve(result as T);
            break;
          } catch (error) {
            attempts++;
            console.warn(`Request attempt ${attempts} failed:`, error);
            
            if (attempts >= retries) {
              reject(error);
              break;
            }
            
            // No delay needed - if error is real, immediate retry will fail quickly
            // If error is transient, immediate retry may succeed
            // Browser and Supabase client handle rate limiting
          }
        }
      };

      const finalExecute = async (): Promise<void> => {
        try {
          await execute();
        } finally {
          // Remove this request from queue
          const index = this.requestQueue.indexOf(finalExecute);
          if (index > -1) {
            this.requestQueue.splice(index, 1);
          }
          
          // Execute next request if any
          if (this.requestQueue.length > 0) {
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
              nextRequest();
            }
          }
        }
      };

      if (this.requestQueue.length < this.maxConcurrentRequests) {
        this.requestQueue.push(finalExecute);
        finalExecute();
      } else {
        this.requestQueue.push(finalExecute);
      }
    });
  }

  // Auth methods
  async signIn(email: string, password: string) {
    return await this.client.auth.signInWithPassword({
      email,
      password
    });
  }

  async signUp(email: string, password: string, metadata?: any) {
    return await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  }

  async signOut() {
    return await this.client.auth.signOut();
  }

  getCurrentUser() {
    return this.client.auth.getUser();
  }

  // Clear request queue and reset connection
  clearQueue(): void {
    this.requestQueue = [];
  }

  // Reset Supabase client to clear any stuck connections
  resetClient(): void {
    this.clearQueue();
    this.initializationPromise = null;
    
    // Validate environment before resetting
    if (!environment?.supabaseUrl || !environment?.supabaseAnonKey) {
      console.error('Cannot reset Supabase client: environment configuration missing');
      return;
    }
    
    try {
      this._supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
            storage: window.localStorage,
            storageKey: 'flouee-auth-session'
          },
          global: {
            headers: {
              'X-Client-Info': 'flouee-diagram-model'
            }
          }
        }
      );
    } catch (error) {
      console.error('Error resetting Supabase client:', error);
    }
  }

  // Database methods
  async getTenants() {
    return await this.client
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async getTenantById(id: string) {
    return await this.client
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getDiagrams(tenantId: string) {
    return await this.client
      .from('diagram_tables')
      .select(`
        *,
        relationships:diagram_relationships(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
  }

  async saveDiagram(diagram: any) {
    return await this.client
      .from('diagram_tables')
      .upsert(diagram);
  }
}
