// Script to create tables using Supabase REST API directly
const https = require('https');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createTable(tableName, data) {
  try {
    console.log(`🔧 Creating table: ${tableName}`);
    
    const url = `${supabaseUrl}/rest/v1/${tableName}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      }
    };

    const { status, data: responseData } = await makeRequest(url, options, data);
    
    if (status === 201) {
      console.log(`✅ Table ${tableName} - Record created successfully`);
      return { success: true, data: responseData };
    } else if (status === 409) {
      console.log(`ℹ️ Table ${tableName} - Record already exists`);
      return { success: true, data: responseData };
    } else {
      console.log(`❌ Table ${tableName} - Failed:`, status, responseData);
      return { success: false, error: responseData };
    }
  } catch (error) {
    console.error(`❌ Error creating table ${tableName}:`, error);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  try {
    console.log('🔌 Testing connection to Supabase...');
    
    // Try to access a system table to test connection
    const url = `${supabaseUrl}/rest/v1/`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };

    const { status, data } = await makeRequest(url, options);
    
    if (status === 200) {
      console.log('✅ Connection successful');
      return true;
    } else {
      console.log('❌ Connection failed:', status, data);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database using REST API...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Cannot connect to Supabase. Please check your credentials.');
      return;
    }
    
    // Create sample data
    console.log('🌱 Creating sample data...');
    
    // Create tenants
    const tenant1 = await createTable('tenants', {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Demo Company',
      slug: 'demo-company'
    });
    
    const tenant2 = await createTable('tenants', {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Test Corp',
      slug: 'test-corp'
    });
    
    // Create users
    const user1 = await createTable('users', {
      id: '650e8400-e29b-41d4-a716-446655440001',
      email: 'admin@demo.com',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'admin'
    });
    
    const user2 = await createTable('users', {
      id: '650e8400-e29b-41d4-a716-446655440002',
      email: 'user@demo.com',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'user'
    });
    
    // Create tenant_users
    const tenantUser1 = await createTable('tenant_users', {
      user_id: '650e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'owner'
    });
    
    const tenantUser2 = await createTable('tenant_users', {
      user_id: '650e8400-e29b-41d4-a716-446655440002',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'member'
    });
    
    // Create diagram_tables
    const diagramTable1 = await createTable('diagram_tables', {
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
    });
    
    const diagramTable2 = await createTable('diagram_tables', {
      id: '750e8400-e29b-41d4-a716-446655440002',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      table_name: 'posts',
      display_name: 'Posts',
      position_x: 300,
      position_y: 100,
      schema_definition: {
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'title', type: 'text', nullable: false },
          { name: 'content', type: 'text', nullable: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'created_at', type: 'timestamp', nullable: false, default: 'NOW()' }
        ]
      }
    });
    
    // Create diagram_relationships
    const relationship1 = await createTable('diagram_relationships', {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      from_table_id: '750e8400-e29b-41d4-a716-446655440001',
      to_table_id: '750e8400-e29b-41d4-a716-446655440002',
      relationship_type: 'one-to-many',
      from_column: 'id',
      to_column: 'user_id'
    });
    
    // Create generated_schemas
    const generatedSchema1 = await createTable('generated_schemas', {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      schema_name: 'blog_schema_v1',
      sql_definition: `-- Generated SQL Schema for Blog
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
      status: 'draft'
    });
    
    console.log('🎉 Database setup completed!');
    
    // Test the setup
    console.log('🧪 Testing setup...');
    
    // Try to read from tenants table
    const testUrl = `${supabaseUrl}/rest/v1/tenants?select=*`;
    const testOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };
    
    const { status: testStatus, data: testData } = await makeRequest(testUrl, testOptions);
    
    if (testStatus === 200) {
      console.log(`✅ Found ${testData.length} tenant(s) in database`);
      console.log('📋 Tenants:', testData.map(t => `${t.name} (${t.slug})`).join(', '));
    } else {
      console.log('❌ Error testing tenants table:', testStatus, testData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupDatabase();








