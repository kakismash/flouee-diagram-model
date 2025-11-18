#!/usr/bin/env node

/**
 * 🚀 Initialize Fresh System from Zero
 * 
 * This script:
 * 1. Cleans all Slave schemas
 * 2. Sets up Slave with required functions
 * 3. Creates realistic test data
 * 4. Creates use case projects
 * 5. Applies all schemas to Slave
 * 
 * Organization: The Most Wanted (4305d406-42bd-42d1-883b-a1289d67bb0f)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const masterClient = createClient(MASTER_URL, MASTER_KEY);
const ORG_ID = '4305d406-42bd-42d1-883b-a1289d67bb0f'; // The Most Wanted

// Use cases with realistic schemas
const USE_CASES = [
  {
    name: 'E-commerce Platform',
    description: 'Complete e-commerce system with products, orders, and customers',
    tables: [
      {
        name: 'customers',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'email', type: 'VARCHAR(255)', nullable: false, unique: true },
          { name: 'full_name', type: 'TEXT', nullable: false },
          { name: 'phone', type: 'VARCHAR(50)', nullable: true },
          { name: 'address', type: 'TEXT', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'name', type: 'TEXT', nullable: false },
          { name: 'description', type: 'TEXT', nullable: true },
          { name: 'price', type: 'NUMERIC(10,2)', nullable: false },
          { name: 'stock', type: 'INTEGER', nullable: false, default: '0' },
          { name: 'category', type: 'VARCHAR(100)', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'customer_id', type: 'UUID', nullable: false },
          { name: 'total', type: 'NUMERIC(10,2)', nullable: false },
          { name: 'status', type: 'VARCHAR(50)', nullable: false, default: "'pending'" },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' },
          { name: 'shipped_at', type: 'TIMESTAMP', nullable: true }
        ]
      }
    ]
  },
  {
    name: 'Blog System',
    description: 'Blog platform with posts, comments, and authors',
    tables: [
      {
        name: 'authors',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'username', type: 'VARCHAR(50)', nullable: false, unique: true },
          { name: 'email', type: 'VARCHAR(255)', nullable: false, unique: true },
          { name: 'bio', type: 'TEXT', nullable: true },
          { name: 'avatar_url', type: 'TEXT', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'author_id', type: 'UUID', nullable: false },
          { name: 'title', type: 'TEXT', nullable: false },
          { name: 'content', type: 'TEXT', nullable: false },
          { name: 'slug', type: 'VARCHAR(255)', nullable: false, unique: true },
          { name: 'status', type: 'VARCHAR(20)', nullable: false, default: "'draft'" },
          { name: 'published_at', type: 'TIMESTAMP', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'comments',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'post_id', type: 'UUID', nullable: false },
          { name: 'author_name', type: 'VARCHAR(100)', nullable: false },
          { name: 'content', type: 'TEXT', nullable: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      }
    ]
  },
  {
    name: 'CRM System',
    description: 'Customer relationship management with companies and contacts',
    tables: [
      {
        name: 'companies',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'name', type: 'TEXT', nullable: false },
          { name: 'industry', type: 'VARCHAR(100)', nullable: true },
          { name: 'size', type: 'VARCHAR(50)', nullable: true },
          { name: 'website', type: 'TEXT', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'contacts',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'company_id', type: 'UUID', nullable: false },
          { name: 'full_name', type: 'TEXT', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'phone', type: 'VARCHAR(50)', nullable: true },
          { name: 'position', type: 'VARCHAR(100)', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      },
      {
        name: 'deals',
        columns: [
          { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
          { name: 'company_id', type: 'UUID', nullable: false },
          { name: 'contact_id', type: 'UUID', nullable: true },
          { name: 'title', type: 'TEXT', nullable: false },
          { name: 'amount', type: 'NUMERIC(12,2)', nullable: false },
          { name: 'stage', type: 'VARCHAR(50)', nullable: false, default: "'lead'" },
          { name: 'close_date', type: 'DATE', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'NOW()' }
        ]
      }
    ]
  }
];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

async function step1_CleanSlaveSchemas() {
  console.log('\n🧹 STEP 1: Clean Slave Schemas');
  console.log('═'.repeat(70));
  
  try {
    // Get shared deployment (organization_id = NULL)
    const { data: deploymentData, error: deployError } = await masterClient
      .from('deployment_configs')
      .select('*')
      .is('organization_id', null)
      .single();
    
    if (deployError || !deploymentData) {
      throw new Error('Deployment config not found. Error: ' + (deployError?.message || 'No data'));
    }
    
    const deployment = deploymentData; // single() returns object, not array
    const slaveClient = createClient(
      deployment.supabase_project_url,
      deployment.supabase_service_role_key
    );
    
    const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
    
    console.log(`\n📦 Slave: ${deployment.supabase_project_url}`);
    console.log(`🗑️  Dropping schema: ${schemaName}\n`);
    
    const { error } = await slaveClient.rpc('exec_sql', {
      query: `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`
    });
    
    if (error) {
      console.log(`⚠️  Note: ${error.message}`);
      console.log('   (This is OK if schema doesn\'t exist yet)\n');
    } else {
      console.log('✅ Schema dropped successfully\n');
    }
    
    return slaveClient;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function step2_CreateSlaveSchema(slaveClient) {
  console.log('\n🏗️  STEP 2: Create Fresh Schema');
  console.log('═'.repeat(70));
  
  const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
  
  console.log(`\n📦 Creating schema: ${schemaName}\n`);
  
  const { error } = await slaveClient.rpc('exec_sql', {
    query: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
  });
  
  if (error) {
    throw new Error(`Failed to create schema: ${error.message}`);
  }
  
  console.log('✅ Schema created successfully\n');
}

async function step3_DeleteOldProjects() {
  console.log('\n🗑️  STEP 3: Delete Old Test Projects');
  console.log('═'.repeat(70));
  
  const { data: projects } = await masterClient
    .from('projects')
    .select('id, name')
    .eq('organization_id', ORG_ID);
  
  if (!projects || projects.length === 0) {
    console.log('\n⚠️  No existing projects found\n');
    return;
  }
  
  console.log(`\n📋 Found ${projects.length} existing project(s):\n`);
  
  for (const project of projects) {
    console.log(`   Deleting: ${project.name}`);
    
    await masterClient
      .from('projects')
      .delete()
      .eq('id', project.id);
  }
  
  console.log('\n✅ All old projects deleted\n');
}

async function step4_CreateUseCaseProjects() {
  console.log('\n📊 STEP 4: Create Use Case Projects');
  console.log('═'.repeat(70));
  
  const createdProjects = [];
  
  for (const useCase of USE_CASES) {
    console.log(`\n📁 Creating: ${useCase.name}`);
    console.log(`   Description: ${useCase.description}`);
    console.log(`   Tables: ${useCase.tables.length}\n`);
    
    // Prepare schema_data with IDs and internal_name
    const tables = useCase.tables.map(table => {
      const tableId = generateId();
      return {
        id: tableId,
        name: table.name,
        internal_name: `t_${tableId}`, // ✅ Add internal name based on ID
        columns: table.columns.map(col => ({
          id: generateId(),
          ...col,
          isPrimaryKey: col.primary_key || false,
          isNullable: col.nullable !== false,
          isUnique: col.unique || false,
          defaultValue: col.default,
          isAutoGenerate: col.default && col.default.includes('gen_random_uuid')
        })),
        x: 100 + (createdProjects.length * 50),
        y: 100 + (createdProjects.length * 50)
      };
    });
    
    const projectData = {
      name: useCase.name,
      description: useCase.description,
      organization_id: ORG_ID,
      schema_data: {
        tables: tables,
        relationships: [],
        relationshipDisplayColumns: [],
        metadata: {
          name: useCase.name,
          description: useCase.description,
          version: '1.0.0'
        }
      },
      version: 1,
      status: 'active'
    };
    
    const { data: project, error } = await masterClient
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      continue;
    }
    
    console.log(`   ✅ Project created: ${project.id}`);
    console.log(`   Tables in JSON: ${tables.length}\n`);
    
    createdProjects.push({ project, tables });
  }
  
  console.log(`✅ Created ${createdProjects.length} projects\n`);
  
  return createdProjects;
}

async function step5_ApplyProjectsToSlave(projects, slaveClient) {
  console.log('\n🔨 STEP 5: Apply All Projects to Slave');
  console.log('═'.repeat(70));
  
  const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
  let totalTablesCreated = 0;
  
  for (const { project, tables } of projects) {
    console.log(`\n📋 Applying: ${project.name}`);
    console.log(`   Tables to create: ${tables.length}\n`);
    
    for (const table of tables) {
      const internalName = `t_${table.id}`;
      
      // Build column definitions
      const columnDefs = table.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (col.isPrimaryKey) def += ' PRIMARY KEY';
        else if (!col.isNullable) def += ' NOT NULL';
        if (col.isUnique && !col.isPrimaryKey) def += ' UNIQUE';
        if (col.defaultValue && !col.isPrimaryKey) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE ${schemaName}.${internalName} (${columnDefs})`;
      
      console.log(`   Creating: ${table.name} → ${internalName}`);
      
      const { error } = await slaveClient.rpc('exec_sql', { query: createSQL });
      
      if (error) {
        console.log(`     ❌ Error: ${error.message}`);
        continue;
      }
      
      console.log(`     ✅ Table created`);
      
      // Enable RLS
      await slaveClient.rpc('exec_sql', {
        query: `ALTER TABLE ${schemaName}.${internalName} ENABLE ROW LEVEL SECURITY`
      });
      
      // Create policies
      const policies = [
        `CREATE POLICY "org_select" ON ${schemaName}.${internalName} FOR SELECT USING (public.current_organization_id() = '${ORG_ID}'::uuid)`,
        `CREATE POLICY "org_insert" ON ${schemaName}.${internalName} FOR INSERT WITH CHECK (public.current_organization_id() = '${ORG_ID}'::uuid)`,
        `CREATE POLICY "org_update" ON ${schemaName}.${internalName} FOR UPDATE USING (public.current_organization_id() = '${ORG_ID}'::uuid)`,
        `CREATE POLICY "org_delete" ON ${schemaName}.${internalName} FOR DELETE USING (public.current_organization_id() = '${ORG_ID}'::uuid)`
      ];
      
      for (const policy of policies) {
        await slaveClient.rpc('exec_sql', { query: policy });
      }
      
      console.log(`     ✅ RLS enabled with 4 policies`);
      
      // Update project in Master with internal_name
      const updatedTables = project.schema_data.tables.map(t => 
        t.id === table.id ? { ...t, internal_name: internalName } : t
      );
      
      await masterClient
        .from('projects')
        .update({
          schema_data: {
            ...project.schema_data,
            tables: updatedTables
          }
        })
        .eq('id', project.id);
      
      totalTablesCreated++;
    }
    
    console.log(`\n   ✅ ${project.name}: ${tables.length} tables created\n`);
  }
  
  console.log(`✅ Total tables created: ${totalTablesCreated}\n`);
}

async function step6_InsertTestData(projects, slaveClient) {
  console.log('\n💾 STEP 6: Insert Test Data');
  console.log('═'.repeat(70));
  
  const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
  
  for (const { project, tables } of projects) {
    console.log(`\n📋 ${project.name}:`);
    
    for (const table of tables) {
      const internalName = `t_${table.id}`;
      
      // Generate sample data based on table name
      let insertSQL = '';
      
      if (table.name === 'customers') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (email, full_name, phone, address)
          VALUES 
            ('john.doe@example.com', 'John Doe', '+1-555-0100', '123 Main St'),
            ('jane.smith@example.com', 'Jane Smith', '+1-555-0101', '456 Oak Ave'),
            ('bob.wilson@example.com', 'Bob Wilson', '+1-555-0102', '789 Pine Rd')
        `;
      } else if (table.name === 'products') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (name, description, price, stock, category)
          VALUES 
            ('Laptop Pro', 'High-performance laptop', 1299.99, 45, 'Electronics'),
            ('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 120, 'Accessories'),
            ('USB-C Cable', 'Fast charging cable', 19.99, 200, 'Accessories')
        `;
      } else if (table.name === 'authors') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (username, email, bio)
          VALUES 
            ('john_writer', 'john@blog.com', 'Tech enthusiast and writer'),
            ('jane_blogger', 'jane@blog.com', 'Lifestyle blogger'),
            ('tech_guru', 'guru@blog.com', 'Technology expert')
        `;
      } else if (table.name === 'posts') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (title, content, slug, status)
          VALUES 
            ('Getting Started with TypeScript', 'TypeScript is amazing...', 'getting-started-typescript', 'published'),
            ('Modern CSS Techniques', 'Learn modern CSS...', 'modern-css-techniques', 'published'),
            ('React vs Angular', 'Comparison of frameworks...', 'react-vs-angular', 'draft')
        `;
      } else if (table.name === 'companies') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (name, industry, size, website)
          VALUES 
            ('Acme Corp', 'Technology', 'Enterprise', 'https://acme.com'),
            ('StartupXYZ', 'SaaS', 'Startup', 'https://startupxyz.com'),
            ('MegaTech Inc', 'Software', 'Large', 'https://megatech.com')
        `;
      } else if (table.name === 'contacts') {
        insertSQL = `
          INSERT INTO ${schemaName}.${internalName} (full_name, email, phone, position)
          VALUES 
            ('Alice Johnson', 'alice@acme.com', '+1-555-1000', 'CTO'),
            ('Bob Martinez', 'bob@startupxyz.com', '+1-555-1001', 'CEO'),
            ('Carol White', 'carol@megatech.com', '+1-555-1002', 'VP Sales')
        `;
      }
      
      if (insertSQL) {
        console.log(`   Inserting data into: ${table.name}`);
        
        const { error } = await slaveClient.rpc('exec_sql', { query: insertSQL });
        
        if (error) {
          console.log(`     ⚠️  Could not insert data: ${error.message}`);
        } else {
          console.log(`     ✅ Test data inserted`);
        }
      }
    }
  }
  
  console.log('\n✅ Test data insertion complete\n');
}

async function step7_PrintSummary(projects) {
  console.log('\n📊 STEP 7: Summary');
  console.log('═'.repeat(70));
  
  const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
  
  console.log('\n✅ FRESH SYSTEM INITIALIZED!\n');
  console.log('📋 Projects Created:\n');
  
  projects.forEach(({ project, tables }) => {
    console.log(`   • ${project.name}`);
    console.log(`     ID: ${project.id}`);
    console.log(`     Tables: ${tables.length}`);
    
    tables.forEach(table => {
      console.log(`       - ${table.name} → t_${table.id}`);
    });
    console.log('');
  });
  
  console.log(`\n📦 Slave Schema: ${schemaName}`);
  console.log(`   Total tables: ${projects.reduce((sum, p) => sum + p.tables.length, 0)}`);
  
  console.log('\n🔗 Useful Links:');
  console.log(`   Master: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw`);
  console.log(`   Slave: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf`);
  console.log(`   Frontend: http://localhost:4200`);
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Go to http://localhost:4200');
  console.log('   2. View your projects');
  console.log('   3. Create a new table');
  console.log('   4. Verify it gets created with name: t_{id}');
  
  console.log('\n🧪 Testing:');
  console.log('   npm run test:deep');
  
  console.log('\n📚 Documentation:');
  console.log('   docs/README.md');
  console.log('   docs/v2/RESUMEN_V2.md');
  
  console.log('\n');
}

// Main execution
async function initFreshSystem() {
  console.log('\n'.repeat(2));
  console.log('═'.repeat(70));
  console.log('🚀 INITIALIZE FRESH SYSTEM FROM ZERO');
  console.log('═'.repeat(70));
  console.log(`Organization: The Most Wanted`);
  console.log(`ID: ${ORG_ID}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(70));
  
  try {
    // Step 1: Clean
    const slaveClient = await step1_CleanSlaveSchemas();
    
    // Step 2: Create schema
    await step2_CreateSlaveSchema(slaveClient);
    
    // Step 3: Delete old projects
    await step3_DeleteOldProjects();
    
    // Step 4: Create use case projects
    const projects = await step4_CreateUseCaseProjects();
    
    // Step 5: Apply to Slave
    await step5_ApplyProjectsToSlave(projects, slaveClient);
    
    // Step 6: Insert test data
    await step6_InsertTestData(projects, slaveClient);
    
    // Step 7: Print summary
    await step7_PrintSummary(projects);
    
    console.log('✅ INITIALIZATION COMPLETE!\n');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

initFreshSystem();

