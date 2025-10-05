import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private requestQueue: (() => Promise<void>)[] = [];
  private maxConcurrentRequests = 3;

  constructor() {
    this.supabase = createClient(
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

  get client(): SupabaseClient {
    return this.supabase;
  }

  // Queue management to prevent concurrent request issues
  async executeRequest<T>(request: () => Promise<T>, retries: number = 3): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        let attempts = 0;
        
        while (attempts < retries) {
          try {
            // Add timeout to prevent hanging requests
            const timeoutPromise = new Promise<never>((_, timeoutReject) => {
              setTimeout(() => timeoutReject(new Error('Request timeout')), 10000); // 10 second timeout
            });
            
            const result = await Promise.race([request(), timeoutPromise]);
            resolve(result as T);
            break;
          } catch (error) {
            attempts++;
            console.warn(`Request attempt ${attempts} failed:`, error);
            
            if (attempts >= retries) {
              reject(error);
              break;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
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
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  async signUp(email: string, password: string, metadata?: any) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  getCurrentUser() {
    return this.supabase.auth.getUser();
  }

  // Clear request queue and reset connection
  clearQueue(): void {
    this.requestQueue = [];
  }

  // Reset Supabase client to clear any stuck connections
  resetClient(): void {
    this.clearQueue();
    this.supabase = createClient(
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

  // Database methods
  async getTenants() {
    return await this.supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async getTenantById(id: string) {
    return await this.supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getDiagrams(tenantId: string) {
    return await this.supabase
      .from('diagram_tables')
      .select(`
        *,
        relationships:diagram_relationships(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
  }

  async saveDiagram(diagram: any) {
    return await this.supabase
      .from('diagram_tables')
      .upsert(diagram);
  }

  async generateSchema(tenantId: string, schemaName: string, tables: any[], relationships: any[]) {
    return await this.supabase.functions.invoke('generate-schema', {
      body: {
        tenant_id: tenantId,
        schema_name: schemaName,
        tables,
        relationships
      }
    });
  }
}
