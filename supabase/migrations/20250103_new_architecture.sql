-- New Architecture Migration
-- This migration creates the new robust schema structure

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS generated_schemas CASCADE;
DROP TABLE IF EXISTS diagram_relationships CASCADE;
DROP TABLE IF EXISTS diagram_tables CASCADE;
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Create clients table (internal)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schemas table (per client)
CREATE TABLE schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'failed')),
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, name, version)
);

-- Create tables table (per schema)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_id UUID REFERENCES schemas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schema_id, name)
);

-- Create columns table (per table)
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    nullable BOOLEAN DEFAULT true,
    unique BOOLEAN DEFAULT false,
    primary_key BOOLEAN DEFAULT false,
    default_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_id, name)
);

-- Create relationships table (per schema)
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_id UUID REFERENCES schemas(id) ON DELETE CASCADE,
    from_table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    to_table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('one-to-one', 'one-to-many', 'many-to-many')),
    junction_table_name TEXT, -- For many-to-many relationships
    from_column TEXT NOT NULL,
    to_column TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_schemas_client_id ON schemas(client_id);
CREATE INDEX idx_tables_schema_id ON tables(schema_id);
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_relationships_schema_id ON relationships(schema_id);
CREATE INDEX idx_relationships_from_table ON relationships(from_table_id);
CREATE INDEX idx_relationships_to_table ON relationships(to_table_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schemas_updated_at BEFORE UPDATE ON schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();








