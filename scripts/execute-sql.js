// Script to execute SQL directly using Supabase REST API
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

async function executeSQL(sql) {
  try {
    console.log('📝 Executing SQL...');
    
    // Use the REST API to execute SQL
    const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };

    const { status, data } = await makeRequest(url, options, { sql });
    
    if (status === 200 || status === 201) {
      console.log('✅ SQL executed successfully');
      return { success: true, data };
    } else {
      console.log('❌ SQL execution failed:', status, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    return { success: false, error: error.message };
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database using REST API...');
    
    // First, let's try to create a simple function to execute SQL
    console.log('🔧 Creating exec_sql function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
        RETURN 'SQL executed successfully';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'Error: ' || SQLERRM;
      END;
      $$;
    `;
    
    // Try to execute this using a different approach
    const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    };

    console.log('📡 Making request to Supabase...');
    const { status, data } = await makeRequest(url, options, { sql: createFunctionSQL });
    
    console.log('📊 Response status:', status);
    console.log('📊 Response data:', data);
    
    if (status === 200 || status === 201) {
      console.log('✅ Function created successfully');
      
      // Now execute our main SQL
      const mainSQL = `
        -- Enable necessary extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        
        -- Create tenants table
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const result = await executeSQL(mainSQL);
      if (result.success) {
        console.log('✅ Main SQL executed successfully');
      } else {
        console.log('❌ Main SQL failed:', result.error);
      }
    } else {
      console.log('❌ Function creation failed:', status, data);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupDatabase();








