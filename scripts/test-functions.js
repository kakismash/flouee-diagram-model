// Script to test Edge Functions
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateTable() {
  try {
    console.log('🧪 Testing create-table function...');
    
    const { data, error } = await supabase.functions.invoke('create-table', {
      body: {
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        table_name: 'products',
        display_name: 'Products',
        position_x: 200,
        position_y: 150,
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'text', nullable: false },
          { name: 'price', type: 'decimal', nullable: false },
          { name: 'description', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: false, default: 'NOW()' }
        ],
        create_actual_table: false
      }
    });
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    console.log('✅ Table created successfully:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function testGenerateSchema() {
  try {
    console.log('🧪 Testing generate-schema function...');
    
    // First, get existing tables and relationships
    const { data: tables } = await supabase
      .from('diagram_tables')
      .select('*')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440001');
    
    const { data: relationships } = await supabase
      .from('diagram_relationships')
      .select('*')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440001');
    
    const { data, error } = await supabase.functions.invoke('generate-schema', {
      body: {
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        schema_name: 'test_schema_v1',
        tables: tables.map(t => ({
          name: t.table_name,
          columns: t.schema_definition.columns
        })),
        relationships: relationships.map(r => ({
          from_table: tables.find(t => t.id === r.from_table_id)?.table_name,
          to_table: tables.find(t => t.id === r.to_table_id)?.table_name,
          from_column: r.from_column,
          to_column: r.to_column,
          relationship_type: r.relationship_type
        }))
      }
    });
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    console.log('✅ Schema generated successfully:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function testCreateTenant() {
  try {
    console.log('🧪 Testing create-tenant function...');
    
    const { data, error } = await supabase.functions.invoke('create-tenant', {
      body: {
        name: 'Test Company 2',
        slug: 'test-company-2',
        admin_email: 'admin@test2.com',
        admin_name: 'Test Admin 2'
      }
    });
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    console.log('✅ Tenant created successfully:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function runTests() {
  console.log('🚀 Testing Edge Functions...');
  console.log('=' .repeat(50));
  
  // Test create tenant
  await testCreateTenant();
  console.log('');
  
  // Test create table
  await testCreateTable();
  console.log('');
  
  // Test generate schema
  await testGenerateSchema();
  console.log('');
  
  console.log('🎉 All tests completed!');
}

// Run the tests
runTests();








