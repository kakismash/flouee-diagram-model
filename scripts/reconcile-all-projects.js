#!/usr/bin/env node

/**
 * 🔄 Reconcile All Projects - Master ↔ Slave
 * 
 * This script checks all projects for version mismatches and fixes them
 * Run this periodically or add to cron job
 */

const MASTER_URL = 'https://cwbywxaafncyplgsrblw.supabase.co';
const MASTER_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODYzNDYsImV4cCI6MjA3MTk2MjM0Nn0.OANkRlYa6rcCO-Ri3U5h8hfNnYX2-bX_BoalaNfmj9s';

const SLAVE_URL = 'https://ffzufnwxvqngglsapqrf.supabase.co';
const SLAVE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmenVmbnl4dnFuZ2dsc2FwcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MTY1MDIsImV4cCI6MjA1MjI5MjUwMn0.z8VPfOLLxBx5i_efOJmD8_NEbr-Lps7bLNbFLpWSQoc';

async function fetchFromMaster() {
  const response = await fetch(
    `${MASTER_URL}/rest/v1/projects?select=id,organization_id,name,version,schema_data`,
    {
      headers: {
        'apikey': MASTER_ANON_KEY,
        'Authorization': `Bearer ${MASTER_ANON_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch from Master: ${response.statusText}`);
  }

  return await response.json();
}

async function getSlaveMetadata(orgId, projectId) {
  const schemaName = `org_${orgId.replace(/-/g, '')}`;
  
  const response = await fetch(
    `${SLAVE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': SLAVE_ANON_KEY,
        'Authorization': `Bearer ${SLAVE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          SELECT 
            project_id,
            schema_version,
            sync_status,
            last_synced_at,
            last_error
          FROM ${schemaName}.__schema_metadata__
          WHERE project_id = '${projectId}'
        `
      })
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.[0] || null;
}

async function compareSchemaConstraints(orgId, tableName, masterColumns) {
  const schemaName = `org_${orgId.replace(/-/g, '')}`;
  
  // Get constraints from Slave
  const response = await fetch(
    `${SLAVE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': SLAVE_ANON_KEY,
        'Authorization': `Bearer ${SLAVE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          SELECT
            tc.constraint_type,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = '${schemaName}'
            AND tc.table_name = '${tableName}'
            AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
        `
      })
    }
  );

  if (!response.ok) {
    return [];
  }

  const slaveConstraints = await response.json();
  const missingConstraints = [];

  // Check each column that should have UNIQUE
  masterColumns.forEach(col => {
    if (col.isUnique || col.unique) {
      const hasConstraint = slaveConstraints.some(
        sc => sc.column_name === col.name && sc.constraint_type === 'UNIQUE'
      );
      
      if (!hasConstraint) {
        missingConstraints.push({
          table: tableName,
          column: col.name,
          constraint: 'UNIQUE'
        });
      }
    }
  });

  return missingConstraints;
}

async function main() {
  console.log('🔄 Starting Full Project Reconciliation\n');
  console.log('=====================================\n');

  try {
    // 1. Fetch all projects from Master
    console.log('📖 Fetching projects from Master...');
    const projects = await fetchFromMaster();
    console.log(`✅ Found ${projects.length} projects\n`);

    if (projects.length === 0) {
      console.log('No projects to reconcile.');
      return;
    }

    const issues = [];

    // 2. Check each project
    for (const project of projects) {
      console.log(`📊 Checking: ${project.name} (${project.id.substring(0, 8)}...)`);
      console.log(`   Master version: ${project.version}`);

      // Get Slave metadata
      const slaveMetadata = await getSlaveMetadata(project.organization_id, project.id);

      if (!slaveMetadata) {
        console.log(`   ⚠️  No metadata in Slave - project not deployed yet`);
        issues.push({
          projectId: project.id,
          projectName: project.name,
          type: 'missing_metadata',
          masterVersion: project.version,
          slaveVersion: null
        });
        console.log('');
        continue;
      }

      console.log(`   Slave version: ${slaveMetadata.schema_version}`);
      console.log(`   Sync status: ${slaveMetadata.sync_status}`);

      const versionGap = project.version - slaveMetadata.schema_version;

      if (versionGap > 0) {
        console.log(`   🚨 VERSION MISMATCH: ${versionGap} versions behind!`);
        
        issues.push({
          projectId: project.id,
          projectName: project.name,
          type: 'version_mismatch',
          masterVersion: project.version,
          slaveVersion: slaveMetadata.schema_version,
          gap: versionGap
        });

        // Check for missing constraints
        if (project.schema_data?.tables) {
          console.log(`   🔍 Checking constraints...`);
          
          for (const table of project.schema_data.tables) {
            const tableName = table.internal_name || `t_${table.id}`;
            const missingConstraints = await compareSchemaConstraints(
              project.organization_id,
              tableName,
              table.columns || []
            );

            if (missingConstraints.length > 0) {
              console.log(`   ❌ Missing constraints in ${table.name}:`);
              missingConstraints.forEach(mc => {
                console.log(`      - ${mc.column}: ${mc.constraint}`);
              });

              issues.push({
                projectId: project.id,
                projectName: project.name,
                type: 'missing_constraint',
                table: table.name,
                constraints: missingConstraints
              });
            }
          }
        }
      } else if (versionGap === 0) {
        console.log(`   ✅ In sync`);
      } else {
        console.log(`   ⚠️  Slave is AHEAD of Master (unusual)`);
        issues.push({
          projectId: project.id,
          projectName: project.name,
          type: 'slave_ahead',
          masterVersion: project.version,
          slaveVersion: slaveMetadata.schema_version
        });
      }

      console.log('');
    }

    // 3. Summary
    console.log('\n=====================================');
    console.log('📋 SUMMARY\n');

    if (issues.length === 0) {
      console.log('✅ All projects are in sync!');
    } else {
      console.log(`⚠️  Found ${issues.length} issue(s):\n`);

      const grouped = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
      }, {});

      Object.keys(grouped).forEach(type => {
        const count = grouped[type].length;
        console.log(`   ${type}: ${count}`);
      });

      console.log('\n📝 Detailed Issues:\n');
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.projectName}`);
        console.log(`   Type: ${issue.type}`);
        if (issue.gap) {
          console.log(`   Gap: ${issue.gap} versions (Master ${issue.masterVersion} vs Slave ${issue.slaveVersion})`);
        }
        if (issue.constraints) {
          console.log(`   Missing constraints: ${issue.constraints.length}`);
        }
        console.log('');
      });

      console.log('\n🔧 To fix issues, run:');
      console.log('   node scripts/fix-project-version.js <project-id>');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();







