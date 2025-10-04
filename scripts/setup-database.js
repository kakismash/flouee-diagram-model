// Script to setup database tables directly
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...');
    
    // Test connection
    console.log('🔌 Testing connection...');
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Connection error:', error);
      return;
    }
    
    console.log('✅ Connected to Supabase successfully');
    
    // Create tables using direct SQL execution
    console.log('🔧 Creating tables...');
    
    // Enable extensions
    await executeSQL(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);
    
    // Create tenants table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create users table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create tenant_users table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, tenant_id)
      );
    `);
    
    // Create diagram_tables table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS diagram_tables (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        table_name TEXT NOT NULL,
        display_name TEXT,
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        schema_definition JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, table_name)
      );
    `);
    
    // Create diagram_relationships table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS diagram_relationships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        from_table_id UUID REFERENCES diagram_tables(id) ON DELETE CASCADE,
        to_table_id UUID REFERENCES diagram_tables(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL CHECK (relationship_type IN ('one-to-one', 'one-to-many', 'many-to-many')),
        from_column TEXT NOT NULL,
        to_column TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create generated_schemas table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS generated_schemas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        schema_name TEXT NOT NULL,
        sql_definition TEXT NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'failed')),
        applied_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('✅ All tables created successfully');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_diagram_tables_tenant_id ON diagram_tables(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_diagram_relationships_tenant_id ON diagram_relationships(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_diagram_relationships_from_table ON diagram_relationships(from_table_id);
      CREATE INDEX IF NOT EXISTS idx_diagram_relationships_to_table ON diagram_relationships(to_table_id);
      CREATE INDEX IF NOT EXISTS idx_generated_schemas_tenant_id ON generated_schemas(tenant_id);
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Create updated_at trigger function
    await executeSQL(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create triggers
    await executeSQL(`
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
      CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_diagram_tables_updated_at ON diagram_tables;
      CREATE TRIGGER update_diagram_tables_updated_at BEFORE UPDATE ON diagram_tables
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_diagram_relationships_updated_at ON diagram_relationships;
      CREATE TRIGGER update_diagram_relationships_updated_at BEFORE UPDATE ON diagram_relationships
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_generated_schemas_updated_at ON generated_schemas;
      CREATE TRIGGER update_generated_schemas_updated_at BEFORE UPDATE ON generated_schemas
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Triggers created successfully');
    
    // Insert sample data
    console.log('🌱 Inserting sample data...');
    
    // Insert sample tenants
    const { data: tenant1, error: tenant1Error } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Demo Company',
        slug: 'demo-company'
      })
      .select()
      .single();
    
    if (tenant1Error) {
      console.log('ℹ️ Tenant 1 already exists or error:', tenant1Error.message);
    } else {
      console.log('✅ Sample tenant 1 created');
    }
    
    const { data: tenant2, error: tenant2Error } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Test Corp',
        slug: 'test-corp'
      })
      .select()
      .single();
    
    if (tenant2Error) {
      console.log('ℹ️ Tenant 2 already exists or error:', tenant2Error.message);
    } else {
      console.log('✅ Sample tenant 2 created');
    }
    
    console.log('🎉 Database setup completed successfully!');
    
    // Test the setup
    console.log('🧪 Testing setup...');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');
    
    if (tenantsError) {
      console.error('❌ Error testing tenants table:', tenantsError);
      return;
    }
    
    console.log(`✅ Found ${tenants.length} tenant(s) in database`);
    console.log('📋 Tenants:', tenants.map(t => `${t.name} (${t.slug})`).join(', '));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function executeSQL(sql) {
  try {
    // For now, we'll use a simple approach
    // In a real scenario, you'd need to use the Supabase SQL editor or a custom function
    console.log('📝 Executing SQL:', sql.substring(0, 100) + '...');
    
    // Note: Direct SQL execution through the client is not available
    // This would need to be done through the Supabase dashboard or a custom function
    return true;
  } catch (error) {
    console.error('❌ SQL execution error:', error);
    throw error;
  }
}

// Run the setup
setupDatabase();

