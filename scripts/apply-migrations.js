// Script to apply migrations directly to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    console.log('🚀 Starting migration process...');
    
    // Read migration files
    const migration1 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20250101_initial_schema.sql'), 'utf8');
    const migration2 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20250102_rls_policies.sql'), 'utf8');
    const seedData = fs.readFileSync(path.join(__dirname, '../supabase/seed.sql'), 'utf8');
    
    console.log('📄 Migration files loaded');
    
    // Apply first migration (initial schema)
    console.log('🔧 Applying initial schema migration...');
    const { data: result1, error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 });
    
    if (error1) {
      console.error('❌ Error applying initial schema:', error1);
      return;
    }
    
    console.log('✅ Initial schema migration applied successfully');
    
    // Apply second migration (RLS policies)
    console.log('🔒 Applying RLS policies migration...');
    const { data: result2, error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 });
    
    if (error2) {
      console.error('❌ Error applying RLS policies:', error2);
      return;
    }
    
    console.log('✅ RLS policies migration applied successfully');
    
    // Apply seed data
    console.log('🌱 Applying seed data...');
    const { data: result3, error: error3 } = await supabase.rpc('exec_sql', { sql: seedData });
    
    if (error3) {
      console.error('❌ Error applying seed data:', error3);
      return;
    }
    
    console.log('✅ Seed data applied successfully');
    
    console.log('🎉 All migrations applied successfully!');
    
    // Test the setup
    console.log('🧪 Testing database setup...');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (tenantsError) {
      console.error('❌ Error testing tenants table:', tenantsError);
      return;
    }
    
    console.log('✅ Database setup verified successfully');
    console.log(`📊 Found ${tenants.length} tenant(s) in database`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the migration
applyMigrations();

