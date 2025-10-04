const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAuthMigrations() {
  try {
    console.log('🚀 Applying authentication migrations...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/003_enable_rls_and_auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('🎉 Authentication migrations completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Create a user account by signing up in the application');
    console.log('2. The user will be automatically assigned to an organization');
    console.log('3. All projects will be scoped to the user\'s organization');
    console.log('4. RLS policies will ensure data isolation between organizations');

  } catch (error) {
    console.error('💥 Failed to apply migrations:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function applyMigrationsDirect() {
  try {
    console.log('🚀 Applying authentication migrations (direct method)...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/003_enable_rls_and_auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Execute the entire migration as one block
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Create a user account by signing up in the application');
    console.log('2. The user will be automatically assigned to an organization');
    console.log('3. All projects will be scoped to the user\'s organization');
    console.log('4. RLS policies will ensure data isolation between organizations');

  } catch (error) {
    console.error('💥 Failed to apply migrations:', error);
    process.exit(1);
  }
}

// Check if we have the exec_sql function, if not, provide manual instructions
async function checkAndApply() {
  try {
    console.log('🔍 Checking if exec_sql function exists...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
    
    if (error && error.message.includes('function exec_sql')) {
      console.log('⚠️  exec_sql function not available');
      console.log('');
      console.log('📋 Manual migration required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of: supabase/migrations/003_enable_rls_and_auth.sql');
      console.log('4. Execute the SQL');
      console.log('');
      console.log('📄 Migration file location: supabase/migrations/003_enable_rls_and_auth.sql');
      return;
    }

    // Function exists, proceed with migration
    await applyMigrationsDirect();

  } catch (error) {
    console.error('💥 Error checking migration capability:', error);
    console.log('');
    console.log('📋 Manual migration required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of: supabase/migrations/003_enable_rls_and_auth.sql');
    console.log('4. Execute the SQL');
  }
}

// Run the migration
checkAndApply();






