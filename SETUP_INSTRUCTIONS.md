# 🚀 Supabase Setup Instructions

## Step 1: Create Database Tables

Go to your Supabase dashboard: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw

1. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Execute the Initial Schema Migration**
   Copy and paste the following SQL code and execute it:

```sql
-- Initial database schema for Flouee Diagram Model
-- This migration creates the base structure for the multi-tenant system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tenants table (client registry)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (system users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_users table (user-tenant association)
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Create diagram_tables table (diagram table definitions)
CREATE TABLE diagram_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    display_name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    schema_definition JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, table_name)
);

-- Create diagram_relationships table (relationships between tables)
CREATE TABLE diagram_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    from_table_id UUID REFERENCES diagram_tables(id) ON DELETE CASCADE,
    to_table_id UUID REFERENCES diagram_tables(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('one-to-one', 'one-to-many', 'many-to-many')),
    from_column TEXT NOT NULL,
    to_column TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_schemas table (generated SQL schemas)
CREATE TABLE generated_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    sql_definition TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'failed')),
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_diagram_tables_tenant_id ON diagram_tables(tenant_id);
CREATE INDEX idx_diagram_relationships_tenant_id ON diagram_relationships(tenant_id);
CREATE INDEX idx_diagram_relationships_from_table ON diagram_relationships(from_table_id);
CREATE INDEX idx_diagram_relationships_to_table ON diagram_relationships(to_table_id);
CREATE INDEX idx_generated_schemas_tenant_id ON generated_schemas(tenant_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagram_tables_updated_at BEFORE UPDATE ON diagram_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagram_relationships_updated_at BEFORE UPDATE ON diagram_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_schemas_updated_at BEFORE UPDATE ON generated_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. **Execute the RLS Policies Migration**
   Create another new query and execute this SQL:

```sql
-- Row Level Security (RLS) policies for multi-tenant isolation
-- This migration enables RLS and creates security policies

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schemas ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = tenant_uuid
        AND tu.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenants" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can update their tenants" ON tenants
    FOR UPDATE USING (is_tenant_admin(id));

-- Users policies
CREATE POLICY "Users can view users in their tenants" ON users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert users in their tenants" ON users
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update users in their tenants" ON users
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Tenant users policies
CREATE POLICY "Users can view tenant_users in their tenants" ON tenant_users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage tenant_users" ON tenant_users
    FOR ALL USING (is_tenant_admin(tenant_id));

-- Diagram tables policies
CREATE POLICY "Users can view diagram_tables in their tenants" ON diagram_tables
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert diagram_tables in their tenants" ON diagram_tables
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update diagram_tables in their tenants" ON diagram_tables
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete diagram_tables in their tenants" ON diagram_tables
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Diagram relationships policies
CREATE POLICY "Users can view diagram_relationships in their tenants" ON diagram_relationships
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert diagram_relationships in their tenants" ON diagram_relationships
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update diagram_relationships in their tenants" ON diagram_relationships
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete diagram_relationships in their tenants" ON diagram_relationships
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Generated schemas policies
CREATE POLICY "Users can view generated_schemas in their tenants" ON generated_schemas
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert generated_schemas in their tenants" ON generated_schemas
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update generated_schemas in their tenants" ON generated_schemas
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete generated_schemas in their tenants" ON generated_schemas
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );
```

4. **Insert Sample Data**
   Create another new query and execute this SQL:

```sql
-- Seed data for development and testing
-- This file contains initial data for the Flouee Diagram Model

-- Insert sample tenants
INSERT INTO tenants (id, name, slug) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Demo Company', 'demo-company'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Test Corp', 'test-corp'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Sample Inc', 'sample-inc');

-- Insert sample users
INSERT INTO users (id, email, tenant_id, role) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', 'admin@demo.com', '550e8400-e29b-41d4-a716-446655440001', 'admin'),
    ('650e8400-e29b-41d4-a716-446655440002', 'user@demo.com', '550e8400-e29b-41d4-a716-446655440001', 'user'),
    ('650e8400-e29b-41d4-a716-446655440003', 'admin@test.com', '550e8400-e29b-41d4-a716-446655440002', 'admin');

-- Insert sample tenant_users associations
INSERT INTO tenant_users (user_id, tenant_id, role) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'owner'),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'member'),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'owner');

-- Insert sample diagram tables
INSERT INTO diagram_tables (id, tenant_id, table_name, display_name, position_x, position_y, schema_definition) VALUES
    ('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'users', 'Users', 100, 100, '{
        "columns": [
            {"name": "id", "type": "uuid", "primaryKey": true, "nullable": false},
            {"name": "email", "type": "text", "nullable": false, "unique": true},
            {"name": "name", "type": "text", "nullable": false},
            {"name": "created_at", "type": "timestamp", "nullable": false, "default": "NOW()"}
        ]
    }'),
    ('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'posts', 'Posts', 300, 100, '{
        "columns": [
            {"name": "id", "type": "uuid", "primaryKey": true, "nullable": false},
            {"name": "title", "type": "text", "nullable": false},
            {"name": "content", "type": "text", "nullable": true},
            {"name": "user_id", "type": "uuid", "nullable": false},
            {"name": "created_at", "type": "timestamp", "nullable": false, "default": "NOW()"}
        ]
    }'),
    ('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'comments', 'Comments', 500, 100, '{
        "columns": [
            {"name": "id", "type": "uuid", "primaryKey": true, "nullable": false},
            {"name": "content", "type": "text", "nullable": false},
            {"name": "post_id", "type": "uuid", "nullable": false},
            {"name": "user_id", "type": "uuid", "nullable": false},
            {"name": "created_at", "type": "timestamp", "nullable": false, "default": "NOW()"}
        ]
    }');

-- Insert sample diagram relationships
INSERT INTO diagram_relationships (tenant_id, from_table_id, to_table_id, relationship_type, from_column, to_column) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 'one-to-many', 'id', 'user_id'),
    ('550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440003', 'one-to-many', 'id', 'post_id'),
    ('550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 'one-to-many', 'id', 'user_id');

-- Insert sample generated schema
INSERT INTO generated_schemas (tenant_id, schema_name, sql_definition, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'blog_schema_v1', '-- Generated SQL Schema for Blog
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
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);', 'draft');
```

## Step 2: Deploy Edge Functions

1. **Navigate to Edge Functions**
   - Click on "Edge Functions" in the left sidebar

2. **Create the create-tenant function**
   - Click "Create a new function"
   - Name: `create-tenant`
   - Copy the code from `supabase/functions/create-tenant/index.ts`
   - Click "Deploy"

3. **Create the generate-schema function**
   - Click "Create a new function"
   - Name: `generate-schema`
   - Copy the code from `supabase/functions/generate-schema/index.ts`
   - Click "Deploy"

## Step 3: Test the Setup

After completing the above steps, run this command to test:

```bash
node scripts/create-tables.js
```

This should now work and show successful creation of sample data.

## Step 4: Verify in Supabase Dashboard

1. **Check Tables**
   - Go to "Table Editor"
   - You should see all the tables: tenants, users, tenant_users, diagram_tables, diagram_relationships, generated_schemas

2. **Check Edge Functions**
   - Go to "Edge Functions"
   - You should see: create-tenant, generate-schema

3. **Check Authentication**
   - Go to "Authentication" > "Users"
   - You can create test users here

## Next Steps

Once the database is set up, we can:
1. Start building the Angular frontend
2. Test the Edge Functions
3. Implement the diagram editor
4. Connect everything together

Let me know when you've completed these steps!
