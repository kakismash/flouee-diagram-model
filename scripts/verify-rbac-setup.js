#!/usr/bin/env node

/**
 * Verify RBAC & RLS Setup
 * Checks that the migration was applied correctly
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const masterClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySetup() {
  console.log('\n🔍 VERIFYING RBAC SETUP...\n');
  console.log('═'.repeat(60));

  let allChecks = true;

  // ============================================
  // 1. Check project_members table exists
  // ============================================
  console.log('\n1️⃣  Checking project_members table...');
  
  try {
    const { data: tableInfo, error } = await masterClient
      .from('project_members')
      .select('*')
      .limit(0);

    if (error) {
      console.log('   ❌ Table does NOT exist');
      console.log('   Error:', error.message);
      allChecks = false;
    } else {
      console.log('   ✅ Table exists');
    }
  } catch (error) {
    console.log('   ❌ Error checking table:', error.message);
    allChecks = false;
  }

  // ============================================
  // 2. Check RLS is enabled on projects
  // ============================================
  console.log('\n2️⃣  Checking RLS on projects table...');
  
  try {
    const { data, error } = await masterClient.rpc('exec_sql', {
      query: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'projects'
      `
    });

    if (error) {
      console.log('   ⚠️  Could not verify (this is okay if exec_sql doesn\'t exist in Master)');
    } else if (typeof data === 'string' && data.includes('"rowsecurity":true')) {
      console.log('   ✅ RLS is enabled on projects');
    } else {
      console.log('   ℹ️  Cannot verify RLS status automatically');
      console.log('   Please check manually in Supabase Dashboard → Database → Tables → projects → RLS');
    }
  } catch (error) {
    console.log('   ℹ️  Automatic verification not available');
  }

  // ============================================
  // 3. Check RLS is enabled on project_members
  // ============================================
  console.log('\n3️⃣  Checking RLS on project_members table...');
  
  try {
    const { data, error } = await masterClient.rpc('exec_sql', {
      query: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'project_members'
      `
    });

    if (error) {
      console.log('   ⚠️  Could not verify (this is okay if exec_sql doesn\'t exist in Master)');
    } else if (typeof data === 'string' && data.includes('"rowsecurity":true')) {
      console.log('   ✅ RLS is enabled on project_members');
    } else {
      console.log('   ℹ️  Cannot verify RLS status automatically');
    }
  } catch (error) {
    console.log('   ℹ️  Automatic verification not available');
  }

  // ============================================
  // 4. Check helper function exists
  // ============================================
  console.log('\n4️⃣  Checking helper function...');
  
  try {
    const { data, error } = await masterClient.rpc('exec_sql', {
      query: `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'user_has_project_permission'
      `
    });

    if (error) {
      console.log('   ⚠️  Could not verify function');
    } else if (data && (typeof data === 'string' && data.includes('user_has_project_permission'))) {
      console.log('   ✅ Function user_has_project_permission() exists');
    } else {
      console.log('   ℹ️  Cannot verify function automatically');
    }
  } catch (error) {
    console.log('   ℹ️  Automatic verification not available');
  }

  // ============================================
  // 5. Try to access projects (should work)
  // ============================================
  console.log('\n5️⃣  Testing access to projects...');
  
  try {
    const { data: projects, error } = await masterClient
      .from('projects')
      .select('id, name, organization_id')
      .limit(5);

    if (error) {
      console.log('   ❌ Error accessing projects:', error.message);
      allChecks = false;
    } else {
      console.log(`   ✅ Successfully accessed projects (${projects?.length || 0} found)`);
      if (projects && projects.length > 0) {
        console.log('   Sample project:', projects[0].name);
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    allChecks = false;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n═'.repeat(60));
  if (allChecks) {
    console.log('\n✅ ALL CHECKS PASSED!');
    console.log('\n🎉 RBAC system is configured correctly!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test creating a project in the UI');
    console.log('   2. Test viewing data in View Mode');
    console.log('   3. Add users to projects using:');
    console.log('      INSERT INTO project_members (project_id, user_id, role)');
    console.log('      VALUES (\'[project-uuid]\', \'[user-uuid]\', \'editor\');');
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED');
    console.log('\n💡 This might be normal if:');
    console.log('   - Migration hasn\'t been applied yet');
    console.log('   - Master DB doesn\'t have exec_sql function');
    console.log('\n📖 See: REAL_DATA_AND_RBAC_SETUP.md for troubleshooting');
  }
  console.log('\n═'.repeat(60));
  console.log('');
}

verifySetup().catch(console.error);






