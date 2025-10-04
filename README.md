# Flouee Diagram Model

A visual database schema designer that allows users to create database tables and relationships through a drag-and-drop interface, then generates Supabase-compatible SQL schemas.

## 🏗️ Architecture

### Multi-Tenant Strategy (3 Tiers)
- **Small**: Shared schema with RLS (tenant_id) - Unlimited
- **Medium**: Separate schema per client - Up to 10,000 schemas  
- **Large**: Separate database per client - Up to 1,000 databases

### Tech Stack
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Frontend**: Angular 17+ with standalone components
- **Diagram Engine**: D3.js or Konva.js
- **UI**: Angular Material

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flouee-diagram-model
   ```

2. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Initialize Supabase**
   ```bash
   supabase init
   supabase link --project-ref cwbywxaafncyplgsrblw
   ```

5. **Run migrations**
   ```bash
   supabase db push
   ```

6. **Deploy Edge Functions**
   ```bash
   supabase functions deploy create-tenant
   supabase functions deploy generate-schema
   ```

### Development

1. **Start Supabase locally**
   ```bash
   supabase start
   ```

2. **Run migrations locally**
   ```bash
   supabase db reset
   ```

3. **Seed development data**
   ```bash
   supabase db seed
   ```

## 📁 Project Structure

```
flouee-diagram-model/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # Database migrations
│   │   ├── 20250101_initial_schema.sql
│   │   └── 20250102_rls_policies.sql
│   ├── functions/               # Edge Functions
│   │   ├── create-tenant/
│   │   └── generate-schema/
│   └── seed.sql                 # Development seed data
├── frontend/                    # Angular application (coming soon)
├── env.example                  # Environment variables template
└── README.md
```

## 🔧 Backend API

### Edge Functions

#### Create Tenant
- **Endpoint**: `/functions/v1/create-tenant`
- **Method**: POST
- **Body**: 
  ```json
  {
    "name": "Company Name",
    "slug": "company-slug",
    "admin_email": "admin@company.com",
    "admin_name": "Admin Name"
  }
  ```

#### Generate Schema
- **Endpoint**: `/functions/v1/generate-schema`
- **Method**: POST
- **Body**:
  ```json
  {
    "tenant_id": "uuid",
    "schema_name": "my_schema",
    "tables": [...],
    "relationships": [...]
  }
  ```

## 🗄️ Database Schema

### Core Tables
- `tenants` - Client registry
- `users` - System users
- `tenant_users` - User-tenant associations
- `diagram_tables` - Diagram table definitions
- `diagram_relationships` - Table relationships
- `generated_schemas` - Generated SQL schemas

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure:
- Users can only access data from their assigned tenants
- Tenant admins can manage their tenant's data
- Complete data isolation between tenants

## 🔐 Security

- **Row Level Security (RLS)** for multi-tenant data isolation
- **JWT-based authentication** with tenant context
- **Role-based access control** (owner, admin, member)
- **Service role key** for administrative operations

## 📝 Development Notes

- All code must be in English (comments, variables, functions, etc.)
- Database schemas, table names, column names must be in English
- Communication between developers can be in Spanish
- Start with Small tier implementation only

## 🚀 Next Steps

1. ✅ Configure Supabase project
2. ✅ Create database structure
3. ✅ Implement RLS policies
4. ✅ Create Edge Functions
5. 🔄 Configure Angular project
6. 🔄 Implement diagram editor
7. 🔄 Connect frontend with backend

## 📄 License

[Add your license here]

