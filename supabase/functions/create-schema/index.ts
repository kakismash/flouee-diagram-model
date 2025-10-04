// Edge Function: Create Schema
// This function creates a new schema with tables, columns, and relationships

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  primary_key?: boolean;
  default_value?: string;
}

interface TableDefinition {
  name: string;
  display_name?: string;
  position_x?: number;
  position_y?: number;
  columns: ColumnDefinition[];
}

interface RelationshipDefinition {
  from_table: string;
  to_table: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from_column: string;
  to_column: string;
}

interface CreateSchemaRequest {
  client_id: string;
  schema_name: string;
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
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
    const { client_id, schema_name, tables, relationships }: CreateSchemaRequest = await req.json()

    // Validate required fields
    if (!client_id || !schema_name || !tables || !Array.isArray(tables)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if client exists
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if schema name already exists for this client
    const { data: existingSchema } = await supabaseClient
      .from('schemas')
      .select('id')
      .eq('client_id', client_id)
      .eq('name', schema_name)
      .single()

    if (existingSchema) {
      return new Response(
        JSON.stringify({ error: 'Schema name already exists for this client' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the schema
    const { data: schema, error: schemaError } = await supabaseClient
      .from('schemas')
      .insert({
        client_id,
        name: schema_name,
        version: 1,
        status: 'draft'
      })
      .select()
      .single()

    if (schemaError) {
      throw schemaError
    }

    // Create tables and columns
    const createdTables = [];
    for (const tableDef of tables) {
      // Create table
      const { data: table, error: tableError } = await supabaseClient
        .from('tables')
        .insert({
          schema_id: schema.id,
          name: tableDef.name,
          display_name: tableDef.display_name || tableDef.name,
          position_x: tableDef.position_x || 0,
          position_y: tableDef.position_y || 0
        })
        .select()
        .single()

      if (tableError) {
        throw tableError
      }

      // Create columns
      const createdColumns = [];
      for (const columnDef of tableDef.columns) {
        const { data: column, error: columnError } = await supabaseClient
          .from('columns')
          .insert({
            table_id: table.id,
            name: columnDef.name,
            type: columnDef.type,
            nullable: columnDef.nullable ?? true,
            unique: columnDef.unique ?? false,
            primary_key: columnDef.primary_key ?? false,
            default_value: columnDef.default_value
          })
          .select()
          .single()

        if (columnError) {
          throw columnError
        }

        createdColumns.push(column);
      }

      createdTables.push({
        ...table,
        columns: createdColumns
      });
    }

    // Create relationships
    const createdRelationships = [];
    for (const relDef of relationships || []) {
      // Find table IDs
      const fromTable = createdTables.find(t => t.name === relDef.from_table);
      const toTable = createdTables.find(t => t.name === relDef.to_table);

      if (!fromTable || !toTable) {
        continue; // Skip invalid relationships
      }

      // Generate junction table name for many-to-many
      let junctionTableName = null;
      if (relDef.type === 'many-to-many') {
        const tableNames = [relDef.from_table, relDef.to_table].sort();
        junctionTableName = `${tableNames[0]}_${tableNames[1]}`;
      }

      const { data: relationship, error: relError } = await supabaseClient
        .from('relationships')
        .insert({
          schema_id: schema.id,
          from_table_id: fromTable.id,
          to_table_id: toTable.id,
          type: relDef.type,
          junction_table_name: junctionTableName,
          from_column: relDef.from_column,
          to_column: relDef.to_column
        })
        .select()
        .single()

      if (relError) {
        throw relError
      }

      createdRelationships.push(relationship);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        schema: {
          id: schema.id,
          client_id: schema.client_id,
          name: schema.name,
          version: schema.version,
          status: schema.status,
          created_at: schema.created_at
        },
        tables: createdTables,
        relationships: createdRelationships
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating schema:', error)
    
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








