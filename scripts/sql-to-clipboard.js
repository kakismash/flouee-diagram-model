// Script to copy SQL to clipboard for easy pasting in Supabase Dashboard
const fs = require('fs');
const path = require('path');

function copyToClipboard(text) {
  try {
    // For Windows, we'll use the clipboard command
    const { exec } = require('child_process');
    exec(`echo ${JSON.stringify(text)} | clip`, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Could not copy to clipboard automatically');
        console.log('📋 Please copy the SQL manually from the output below');
        return;
      }
      console.log('✅ SQL copied to clipboard!');
    });
  } catch (error) {
    console.log('❌ Could not copy to clipboard automatically');
    console.log('📋 Please copy the SQL manually from the output below');
  }
}

function displaySQL() {
  console.log('🚀 Flouee Diagram Model - Database Setup');
  console.log('=' .repeat(50));
  console.log('');
  console.log('📋 STEP 1: Copy the following SQL and execute it in Supabase Dashboard');
  console.log('🔗 Go to: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw');
  console.log('🔗 Navigate to: SQL Editor > New Query');
  console.log('');
  console.log('📝 SQL to execute:');
  console.log('=' .repeat(50));
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250101_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(migrationSQL);
  console.log('');
  console.log('=' .repeat(50));
  console.log('');
  console.log('📋 STEP 2: Copy the following RLS SQL and execute it in a new query');
  console.log('');
  console.log('📝 RLS SQL to execute:');
  console.log('=' .repeat(50));
  
  // Read the RLS migration file
  const rlsMigrationPath = path.join(__dirname, '../supabase/migrations/20250102_rls_policies.sql');
  const rlsMigrationSQL = fs.readFileSync(rlsMigrationPath, 'utf8');
  
  console.log(rlsMigrationSQL);
  console.log('');
  console.log('=' .repeat(50));
  console.log('');
  console.log('📋 STEP 3: Copy the following seed data SQL and execute it in a new query');
  console.log('');
  console.log('📝 Seed data SQL to execute:');
  console.log('=' .repeat(50));
  
  // Read the seed file
  const seedPath = path.join(__dirname, '../supabase/seed.sql');
  const seedSQL = fs.readFileSync(seedPath, 'utf8');
  
  console.log(seedSQL);
  console.log('');
  console.log('=' .repeat(50));
  console.log('');
  console.log('🎉 After executing all 3 SQL blocks, run: node scripts/test-setup.js');
  console.log('');
  
  // Try to copy the first SQL to clipboard
  copyToClipboard(migrationSQL);
}

// Run the script
displaySQL();








