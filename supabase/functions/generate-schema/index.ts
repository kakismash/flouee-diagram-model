// Edge Function: Generate Schema
// This function converts diagram tables and relationships to SQL schema

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

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
}

interface RelationshipDefinition {
  from_table: string;
  to_table: string;
  from_column: string;
  to_column: string;
  relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface GenerateSchemaRequest {
  tenant_id: string;
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
    const { tenant_id, schema_name, tables, relationships }: GenerateSchemaRequest = await req.json()

    // Validate required fields
    if (!tenant_id || !schema_name || !tables || !Array.isArray(tables)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate SQL schema
    const sqlSchema = generateSQLSchema(tables, relationships)

    // Save generated schema to database
    const { data: generatedSchema, error: saveError } = await supabaseClient
      .from('generated_schemas')
      .insert({
        tenant_id,
        schema_name,
        sql_definition: sqlSchema,
        status: 'draft'
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        schema: {
          id: generatedSchema.id,
          name: generatedSchema.schema_name,
          sql: generatedSchema.sql_definition,
          status: generatedSchema.status
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error generating schema:', error)
    
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

function generateSQLSchema(tables: TableDefinition[], relationships: RelationshipDefinition[]): string {
  let sql = '-- Generated SQL Schema\n\n'
  
  // Generate CREATE TABLE statements
  for (const table of tables) {
    sql += `CREATE TABLE ${table.name} (\n`
    
    const columnDefinitions: string[] = []
    
    for (const column of table.columns) {
      let columnDef = `    ${column.name} ${column.type.toUpperCase()}`
      
      if (column.primaryKey) {
        columnDef += ' PRIMARY KEY'
      }
      
      if (column.primaryKey && column.type === 'uuid') {
        columnDef += ' DEFAULT uuid_generate_v4()'
      }
      
      if (!column.nullable && !column.primaryKey) {
        columnDef += ' NOT NULL'
      }
      
      if (column.unique && !column.primaryKey) {
        columnDef += ' UNIQUE'
      }
      
      if (column.default && !column.primaryKey) {
        columnDef += ` DEFAULT ${column.default}`
      }
      
      columnDefinitions.push(columnDef)
    }
    
    sql += columnDefinitions.join(',\n')
    sql += '\n);\n\n'
  }
  
  // Generate foreign key constraints
  for (const relationship of relationships) {
    if (relationship.relationship_type === 'one-to-one' || relationship.relationship_type === 'one-to-many') {
      sql += `ALTER TABLE ${relationship.from_table} ADD CONSTRAINT fk_${relationship.from_table}_${relationship.to_table} FOREIGN KEY (${relationship.from_column}) REFERENCES ${relationship.to_table}(${relationship.to_column});\n`
    } else if (relationship.relationship_type === 'many-to-many') {
      // Create junction table
      const junctionTableName = `${relationship.from_table}_${relationship.to_table}`
      sql += `CREATE TABLE ${junctionTableName} (\n`
      sql += `    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n`
      sql += `    ${relationship.from_table}_id UUID NOT NULL REFERENCES ${relationship.from_table}(id),\n`
      sql += `    ${relationship.to_table}_id UUID NOT NULL REFERENCES ${relationship.to_table}(id),\n`
      sql += `    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n`
      sql += `    UNIQUE(${relationship.from_table}_id, ${relationship.to_table}_id)\n`
      sql += `);\n\n`
    }
  }
  
  return sql
}

