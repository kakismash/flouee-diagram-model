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

