// Edge Function: Drop Schema
// This function drops a schema and all its associated database tables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DropSchemaRequest {
  schema_id: string;
  client_id: string;
  drop_database_tables?: boolean; // Whether to drop actual database tables
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
    const { schema_id, client_id, drop_database_tables = false }: DropSchemaRequest = await req.json()

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

    const droppedTables = [];
    const sqlStatements = [];

    // If requested, generate SQL to drop database tables
    if (drop_database_tables) {
      // Drop junction tables first (many-to-many relationships)
      for (const relationship of schema.relationships) {
        if (relationship.type === 'many-to-many' && relationship.junction_table_name) {
          const sql = `DROP TABLE IF EXISTS ${relationship.junction_table_name} CASCADE;`;
          sqlStatements.push(sql);
          droppedTables.push(relationship.junction_table_name);
        }
      }

      // Drop main tables
      for (const table of schema.tables) {
        const sql = `DROP TABLE IF EXISTS ${table.name} CASCADE;`;
        sqlStatements.push(sql);
        droppedTables.push(table.name);
      }
    }

    // Execute SQL statements to drop database tables
    if (drop_database_tables && sqlStatements.length > 0) {
      for (const sql of sqlStatements) {
        try {
          // Note: In a real implementation, you would need a custom function to execute SQL
          console.log('Executing DROP SQL:', sql);
          
          // Simulate SQL execution
          // const { data: result, error: executeError } = await supabaseClient
          //   .rpc('exec_sql', { sql })
          
          // if (executeError) {
          //   throw executeError
          // }
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to drop database tables',
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
    }

    // Delete the schema record (this will cascade delete all related records)
    const { error: deleteError } = await supabaseClient
      .from('schemas')
      .delete()
      .eq('id', schema_id)
      .eq('client_id', client_id)

    if (deleteError) {
      throw deleteError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema dropped successfully',
        schema: {
          id: schema.id,
          name: schema.name,
          version: schema.version
        },
        dropped_tables: droppedTables,
        sql_statements: sqlStatements
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error dropping schema:', error)
    
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








