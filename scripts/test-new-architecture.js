// Script to test the new architecture
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4NjM0NiwiZXhwIjoyMDcxOTYyMzQ2fQ.9RwhsI4HSGdWgw5CchA-PRA7kBK0uAq2D6Y_aHBWu3E';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewArchitecture() {
  try {
    console.log('🚀 Testing New Architecture...');
    console.log('=' .repeat(50));
    
    // 1. Create a test client
    console.log('1️⃣ Creating test client...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert({
        id: 'test-client-001',
        name: 'Test Company',
        slug: 'test-company'
      })
      .select()
      .single();
    
    if (clientError) {
      console.log('❌ Error creating client:', clientError.message);
      return;
    }
    
    console.log('✅ Client created:', client.name);
    
    // 2. Create a schema using the Edge Function
    console.log('\n2️⃣ Creating schema...');
    const { data: schemaData, error: schemaError } = await supabase.functions.invoke('create-schema', {
      body: {
        client_id: client.id,
        schema_name: 'blog_schema',
        tables: [
          {
            name: 'users',
            display_name: 'Users',
            position_x: 100,
            position_y: 100,
            columns: [
              { name: 'id', type: 'uuid', primary_key: true },
              { name: 'email', type: 'text', nullable: false, unique: true },
              { name: 'name', type: 'text', nullable: false },
              { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'NOW()' }
            ]
          },
          {
            name: 'posts',
            display_name: 'Posts',
            position_x: 300,
            position_y: 100,
            columns: [
              { name: 'id', type: 'uuid', primary_key: true },
              { name: 'title', type: 'text', nullable: false },
              { name: 'content', type: 'text', nullable: true },
              { name: 'user_id', type: 'uuid', nullable: false },
              { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'NOW()' }
            ]
          },
          {
            name: 'categories',
            display_name: 'Categories',
            position_x: 500,
            position_y: 100,
            columns: [
              { name: 'id', type: 'uuid', primary_key: true },
              { name: 'name', type: 'text', nullable: false, unique: true },
              { name: 'description', type: 'text', nullable: true }
            ]
          }
        ],
        relationships: [
          {
            from_table: 'users',
            to_table: 'posts',
            type: 'one-to-many',
            from_column: 'id',
            to_column: 'user_id'
          },
          {
            from_table: 'posts',
            to_table: 'categories',
            type: 'many-to-many',
            from_column: 'id',
            to_column: 'id'
          }
        ]
      }
    });
    
    if (schemaError) {
      console.log('❌ Error creating schema:', schemaError.message);
      return;
    }
    
    console.log('✅ Schema created:', schemaData.schema.name);
    console.log('📊 Tables created:', schemaData.tables.length);
    console.log('🔗 Relationships created:', schemaData.relationships.length);
    
    // 3. List schemas
    console.log('\n3️⃣ Listing schemas...');
    const { data: listData, error: listError } = await supabase.functions.invoke('list-schemas', {
      body: {
        client_id: client.id,
        include_details: true
      }
    });
    
    if (listError) {
      console.log('❌ Error listing schemas:', listError.message);
      return;
    }
    
    console.log('✅ Found schemas:', listData.count);
    console.log('📋 Schema names:', listData.schemas.map(s => s.name).join(', '));
    
    // 4. Apply schema (generate SQL)
    console.log('\n4️⃣ Applying schema...');
    const { data: applyData, error: applyError } = await supabase.functions.invoke('apply-schema', {
      body: {
        schema_id: schemaData.schema.id,
        client_id: client.id
      }
    });
    
    if (applyError) {
      console.log('❌ Error applying schema:', applyError.message);
      return;
    }
    
    console.log('✅ Schema applied successfully');
    console.log('📝 SQL statements generated:', applyData.sql_statements.length);
    
    // 5. Show generated SQL
    console.log('\n5️⃣ Generated SQL:');
    console.log('=' .repeat(50));
    applyData.sql_statements.forEach((sql, index) => {
      console.log(`\n-- Statement ${index + 1}:`);
      console.log(sql);
    });
    
    console.log('\n🎉 New architecture test completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testNewArchitecture();








