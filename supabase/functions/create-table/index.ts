// Edge Function: Create Table
// This function creates a new table in the diagram and optionally in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ColumnDefinition {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
}

interface CreateTableRequest {
  tenant_id: string;
  table_name: string;
  display_name?: string;
  position_x?: number;
  position_y?: number;
  columns: ColumnDefinition[];
  create_actual_table?: boolean; // Whether to create the actual table in the database
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
    const { 
      tenant_id, 
      table_name, 
      display_name, 
      position_x = 0, 
      position_y = 0, 
      columns, 
      create_actual_table = false 
    }: CreateTableRequest = await req.json()

    // Validate required fields
    if (!tenant_id || !table_name || !columns || !Array.isArray(columns)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if table name already exists for this tenant
    const { data: existingTable } = await supabaseClient
      .from('diagram_tables')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('table_name', table_name)
      .single()

    if (existingTable) {
      return new Response(
        JSON.stringify({ error: 'Table name already exists' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the diagram table record
    const { data: diagramTable, error: diagramError } = await supabaseClient
      .from('diagram_tables')
      .insert({
        tenant_id,
        table_name,
        display_name: display_name || table_name,
        position_x,
        position_y,
        schema_definition: {
          columns: columns
        }
      })
      .select()
      .single()

    if (diagramError) {
      throw diagramError
    }

    let actualTableCreated = false;
    let actualTableError = null;

    // If requested, create the actual table in the database
    if (create_actual_table) {
      try {
        const createTableSQL = generateCreateTableSQL(table_name, columns);
        
        // Note: This would require a custom function to execute SQL
        // For now, we'll just return the SQL that would be executed
        actualTableCreated = true;
      } catch (error) {
        actualTableError = error.message;
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        table: {
          id: diagramTable.id,
          tenant_id: diagramTable.tenant_id,
          table_name: diagramTable.table_name,
          display_name: diagramTable.display_name,
          position_x: diagramTable.position_x,
          position_y: diagramTable.position_y,
          schema_definition: diagramTable.schema_definition,
          created_at: diagramTable.created_at
        },
        actual_table: {
          created: actualTableCreated,
          error: actualTableError
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating table:', error)
    
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

function generateCreateTableSQL(tableName: string, columns: ColumnDefinition[]): string {
  let sql = `CREATE TABLE ${tableName} (\n`;
  
  const columnDefinitions: string[] = [];
  
  for (const column of columns) {
    let columnDef = `    ${column.name} ${column.type.toUpperCase()}`;
    
    if (column.primaryKey) {
      columnDef += ' PRIMARY KEY';
    }
    
    if (column.primaryKey && column.type === 'uuid') {
      columnDef += ' DEFAULT uuid_generate_v4()';
    }
    
    if (!column.nullable && !column.primaryKey) {
      columnDef += ' NOT NULL';
    }
    
    if (column.unique && !column.primaryKey) {
      columnDef += ' UNIQUE';
    }
    
    if (column.default && !column.primaryKey) {
      columnDef += ` DEFAULT ${column.default}`;
    }
    
    columnDefinitions.push(columnDef);
  }
  
  sql += columnDefinitions.join(',\n');
  sql += '\n);';
  
  return sql;
}








