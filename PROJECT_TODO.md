# Flouee Diagram Model - TODO List

## 📋 **Project Rules**
- **ALL CODE MUST BE IN ENGLISH** (comments, variables, functions, etc.)
- **ALL DOCUMENTATION MUST BE IN ENGLISH**
- **Communication between developers can be in Spanish**
- **Database schemas, table names, column names must be in English**

## 🏗️ **Project Architecture**

### **Multi-Tenant Strategy (3 Tiers)**
- **Small**: Shared schema with RLS (tenant_id) - Unlimited
- **Medium**: Separate schema per client - Up to 10,000 schemas  
- **Large**: Separate database per client - Up to 1,000 databases

### **Tech Stack**
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Frontend**: Angular 17+ with standalone components
- **Diagram Engine**: D3.js or Konva.js
- **UI**: Angular Material

---

## 📋 **Pending Tasks**

### **🔧 Backend (Supabase)**
- [ ] Configure Supabase project
- [ ] Create base database structure
- [ ] Implement tenant system
- [ ] Configure Row Level Security (RLS)
- [ ] Create Edge Functions for:
  - [ ] Client registration
  - [ ] Schema generation
  - [ ] Diagram validation
- [ ] Implement automatic migration between tiers
- [ ] Configure performance monitoring

### **🎨 Frontend (Angular)**
- [ ] Configure Angular project
- [ ] Install dependencies (Angular Material, D3.js)
- [ ] Create component structure
- [ ] Implement authentication
- [ ] Create tenant selector
- [ ] Implement diagram editor
- [ ] Create table components
- [ ] Implement drag & drop
- [ ] Create relationship system
- [ ] Implement schema preview

### **📊 Diagram Engine**
- [ ] Research D3.js vs Konva.js
- [ ] Implement diagram canvas
- [ ] Create visual table components
- [ ] Implement connection system
- [ ] Create relationship types (1:1, 1:M, M:M)
- [ ] Implement visual validation
- [ ] Create zoom/pan system
- [ ] Implement grid/snap

### **🔄 Schema Generator**
- [ ] Define diagram JSON format
- [ ] Create diagram to SQL parser
- [ ] Implement CREATE TABLE generation
- [ ] Create foreign key system
- [ ] Implement schema validation
- [ ] Create SQL preview
- [ ] Implement migration export

### **🔗 Integration**
- [ ] Connect frontend with Supabase
- [ ] Implement real-time updates
- [ ] Create collaboration system
- [ ] Implement diagram versioning
- [ ] Create template system
- [ ] Implement existing schema import

### **🧪 Testing & Deployment**
- [ ] Configure testing (Jest, Cypress)
- [ ] Implement CI/CD
- [ ] Configure staging environment
- [ ] Implement monitoring
- [ ] Create documentation
- [ ] Configure backup strategy

---

## 🎯 **Current Phase: Small Tier Only**

### **Initial Implementation**
- [ ] **Backend**: Shared schema with RLS
- [ ] **Frontend**: Basic diagram editor
- [ ] **Functionality**: Create tables and relationships
- [ ] **Output**: Generate SQL for Supabase

### **Database Structure (Small Tier)**
```sql
-- Public schema
public/
├── tenants/              -- Client registry
├── users/                -- System users  
├── tenant_users/         -- User-tenant association
├── diagram_tables/       -- Diagram tables (with tenant_id)
├── diagram_relationships/ -- Relationships (with tenant_id)
└── generated_schemas/    -- Generated schemas (with tenant_id)
```

---

## 📝 **Notes**
- Start only with Small tier (shared schema)
- Implement Medium and Large tiers later
- Use RLS for data isolation
- Keep simplicity in initial implementation

---

## 🚀 **Next Steps**
1. Configure Supabase project
2. Create database structure
3. Configure Angular project
4. Implement basic diagram editor
