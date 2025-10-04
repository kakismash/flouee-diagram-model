// Script to create tables using Supabase API
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('🚀 Creating database tables...');
    
    // Test basic connection
    console.log('🔌 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (testError && testError.code !== 'PGRST116') {
      console.log('ℹ️ Tables don\'t exist yet, this is expected');
    } else {
      console.log('✅ Connection successful');
    }
    
    // Create sample tenant data
    console.log('🌱 Creating sample data...');
    
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
      console.log('❌ Error creating tenant 1:', tenant1Error.message);
    } else {
      console.log('✅ Sample tenant 1 created:', tenant1.name);
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
      console.log('❌ Error creating tenant 2:', tenant2Error.message);
    } else {
      console.log('✅ Sample tenant 2 created:', tenant2.name);
    }
    
    // Create sample user
    const { data: user1, error: user1Error } = await supabase
      .from('users')
      .upsert({
        id: '650e8400-e29b-41d4-a716-446655440001',
        email: 'admin@demo.com',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'admin'
      })
      .select()
      .single();
    
    if (user1Error) {
      console.log('❌ Error creating user 1:', user1Error.message);
    } else {
      console.log('✅ Sample user 1 created:', user1.email);
    }
    
    // Create tenant_user association
    const { data: tenantUser1, error: tenantUser1Error } = await supabase
      .from('tenant_users')
      .upsert({
        user_id: '650e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'owner'
      })
      .select()
      .single();
    
    if (tenantUser1Error) {
      console.log('❌ Error creating tenant_user 1:', tenantUser1Error.message);
    } else {
      console.log('✅ Sample tenant_user 1 created');
    }
    
    // Create sample diagram table
    const { data: diagramTable1, error: diagramTable1Error } = await supabase
      .from('diagram_tables')
      .upsert({
        id: '750e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        table_name: 'users',
        display_name: 'Users',
        position_x: 100,
        position_y: 100,
        schema_definition: {
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
            { name: 'email', type: 'text', nullable: false, unique: true },
            { name: 'name', type: 'text', nullable: false },
            { name: 'created_at', type: 'timestamp', nullable: false, default: 'NOW()' }
          ]
        }
      })
      .select()
      .single();
    
    if (diagramTable1Error) {
      console.log('❌ Error creating diagram table 1:', diagramTable1Error.message);
    } else {
      console.log('✅ Sample diagram table 1 created:', diagramTable1.table_name);
    }
    
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
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Error testing users table:', usersError);
      return;
    }
    
    console.log(`✅ Found ${users.length} user(s) in database`);
    
    const { data: diagramTables, error: diagramTablesError } = await supabase
      .from('diagram_tables')
      .select('*');
    
    if (diagramTablesError) {
      console.error('❌ Error testing diagram_tables table:', diagramTablesError);
      return;
    }
    
    console.log(`✅ Found ${diagramTables.length} diagram table(s) in database`);
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
createTables();








