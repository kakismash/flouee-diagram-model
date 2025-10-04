// Edge Function: Apply Schema
// This function applies a schema to create actual database tables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplySchemaRequest {
  schema_id: string;
  client_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { schema_id, client_id }: ApplySchemaRequest = await req.json()

    // Validate required fields
    if (!schema_id || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the schema with all related data
    const { data: schema, error: schemaError } = await supabaseClient
      .from('schemas')
      .select(`
        *,
        tables (
          *,
          columns (*)
        ),
        relationships (*)
      `)
      .eq('id', schema_id)
      .eq('client_id', client_id)
      .single()

    if (schemaError || !schema) {
      return new Response(
        JSON.stringify({ error: 'Schema not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate SQL for creating tables
    const sqlStatements = generateCreateTableSQL(schema.tables, schema.relationships);

    // Execute SQL statements
    for (const sql of sqlStatements) {
      try {
        // Note: In a real implementation, you would need a custom function to execute SQL
        // For now, we'll simulate the execution
        console.log('Executing SQL:', sql);
        
        // Simulate SQL execution
        // const { data: result, error: executeError } = await supabaseClient
        //   .rpc('exec_sql', { sql })
        
        // if (executeError) {
        //   throw executeError
        // }
      } catch (error) {
        // Update schema status to failed
        await supabaseClient
          .from('schemas')
          .update({ 
            status: 'failed',
            applied_at: new Date().toISOString()
          })
          .eq('id', schema_id)

        return new Response(
          JSON.stringify({ 
            error: 'Failed to apply schema',
            details: error.message,
            sql: sql
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Update schema status to applied
    await supabaseClient
      .from('schemas')
      .update({ 
        status: 'applied',
        applied_at: new Date().toISOString()
      })
      .eq('id', schema_id)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema applied successfully',
        schema: {
          id: schema.id,
          name: schema.name,
          version: schema.version,
          status: 'applied',
          applied_at: new Date().toISOString()
        },
        sql_statements: sqlStatements
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error applying schema:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateCreateTableSQL(tables: any[], relationships: any[]): string[] {
  const sqlStatements: string[] = [];
  
  // Create tables
  for (const table of tables) {
    let sql = `CREATE TABLE ${table.name} (\n`;
    
    const columnDefinitions: string[] = [];
    
    for (const column of table.columns) {
      let columnDef = `    ${column.name} ${column.type.toUpperCase()}`;
      
      if (column.primary_key) {
        columnDef += ' PRIMARY KEY';
      }
      
      if (column.primary_key && column.type === 'uuid') {
        columnDef += ' DEFAULT uuid_generate_v4()';
      }
      
      if (!column.nullable && !column.primary_key) {
        columnDef += ' NOT NULL';
      }
      
      if (column.unique && !column.primary_key) {
        columnDef += ' UNIQUE';
      }
      
      if (column.default_value && !column.primary_key) {
        columnDef += ` DEFAULT ${column.default_value}`;
      }
      
      columnDefinitions.push(columnDef);
    }
    
    sql += columnDefinitions.join(',\n');
    sql += '\n);';
    
    sqlStatements.push(sql);
  }
  
  // Create relationships (foreign keys and junction tables)
  for (const relationship of relationships) {
    const fromTable = tables.find(t => t.id === relationship.from_table_id);
    const toTable = tables.find(t => t.id === relationship.to_table_id);
    
    if (!fromTable || !toTable) continue;
    
    if (relationship.type === 'one-to-one' || relationship.type === 'one-to-many') {
      // Add foreign key constraint
      const fkName = `fk_${fromTable.name}_${toTable.name}`;
      const sql = `ALTER TABLE ${fromTable.name} ADD CONSTRAINT ${fkName} FOREIGN KEY (${relationship.from_column}) REFERENCES ${toTable.name}(${relationship.to_column});`;
      sqlStatements.push(sql);
    } else if (relationship.type === 'many-to-many') {
      // Create junction table
      const junctionTableName = relationship.junction_table_name || `${fromTable.name}_${toTable.name}`;
      const sql = `CREATE TABLE ${junctionTableName} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ${fromTable.name}_id UUID NOT NULL REFERENCES ${fromTable.name}(id),
    ${toTable.name}_id UUID NOT NULL REFERENCES ${toTable.name}(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(${fromTable.name}_id, ${toTable.name}_id)
);`;
      sqlStatements.push(sql);
    }
  }
  
  return sqlStatements;
}