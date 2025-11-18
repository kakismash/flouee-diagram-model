# 🚀 Flouee Diagram Model

A multi-tenant database schema designer with Master-Slave architecture, automatic schema synchronization, and ID-based naming system.

**Version:** 3.0.0  
**Status:** 🟢 PRODUCTION READY  
**Last Update:** 2025-10-27

## ⚡ Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install

# Configure environment variables
cp env.example .env

# Setup Slave database (REQUIRED - 30 seconds)
# See: docs/setup/SLAVE_SETUP_COMPLETO.sql

# Start the project
cd frontend && npm start

# Run tests
npm test
npm run test:deep
```

## 📊 Architecture

### Master-Slave Synchronous System

```
Master Project (Auth + Metadata)
├── Authentication (Supabase Auth)
├── Users & Organizations
├── Projects (JSON schema storage) ← Source of Truth
├── Schema Changes (audit log)
└── Edge Functions
    └→ apply-schema-change-atomic (Synchronous)
        └→ Slave Project(s) (User Data)
            └── Dynamic schemas per organization
                └── Tables with ID-based naming (t_xxx)
```

**Key Principle:** All schema changes are applied **synchronously** to Master and Slave in a single atomic operation. If Slave fails, Master is not updated (fail-fast approach).

### 🎯 Supabase Projects:

| Project | Ref | Purpose | SQL Editor |
|---------|-----|---------|------------|
| **MASTER** | `cwbywxaafncyplgsrblw` | Auth + Metadata + Control | [Open SQL Editor](https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/sql/new) |
| **SLAVE** | `ffzufnwxvqngglsapqrf` | User Data + Dynamic Schemas | [Open SQL Editor](https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new) |

## 🎯 Features

### **Core:**
- ✅ **Multi-tenant**: Complete data isolation per organization
- ✅ **Master-Slave**: Centralized auth with distributed data
- ✅ **Synchronous sync**: Atomic schema changes applied to both systems
- ✅ **Fail-fast**: If Slave fails, Master is not updated (consistency guaranteed)
- ✅ **ID-based naming**: Conflict-free table/column names (t_xxx, c_xxx)
- ✅ **Optimistic locking**: Concurrent editing support with version control
- ✅ **Automatic rollback**: Failed changes are reverted automatically

### **Schema Management:**
- ✅ **Visual Designer**: Drag-and-drop table creation
- ✅ **Relationship Builder**: Foreign key management
- ✅ **Column Types**: Full PostgreSQL type support
- ✅ **Constraints**: Primary keys, unique, nullable
- ✅ **Real-time Collaboration**: Multiple users editing

### **Security:**
- ✅ **Row Level Security**: Complete data isolation
- ✅ **Role-based Access**: Admin, org_admin, client roles
- ✅ **JWT Authentication**: Secure API access
- ✅ **Organization Isolation**: Cross-tenant data protection

## 🌐 Edge Functions

### **Essential Functions:**

| Function | Description | Purpose |
|----------|-------------|---------|
| `apply-schema-change-atomic` | **Primary schema changes** | Synchronously applies changes to Master and Slave |
| `inspect-slave-schema` | Schema inspection | Debug and verify schemas |
| `verify-schema-sync` | Sync verification | Ensure Master-Slave consistency |

### **Architecture:**
- **Synchronous**: All changes applied atomically in single operation
- **Fail-fast**: If Slave fails, Master is not updated
- **Validated**: Changes are validated and normalized before application

### **Deploy Functions:**
```bash
# Deploy all functions
npm run deploy-functions

# Deploy specific function
npx supabase functions deploy apply-schema-change-atomic
```

## 🔧 Useful Scripts

### **Slave Management:**
```bash
# Setup from scratch
npm run slave:init-fresh

# Complete Slave reset
npm run slave:reset

# Reset + apply existing projects
npm run slave:reset-apply

# Initialize specific Slave
npm run slave:init

# Clone new Slave (wizard)
npm run slave:clone
```

### **Testing:**
```bash
npm test                  # Unit tests
npm run test:deep         # Deep testing (15 tests E2E)
npm run test:coverage     # With coverage report
```

### **Project Management:**
```bash
# Apply project to Slave
npm run apply-to-slave <project-id>

# Delete project with cleanup
npm run delete-project <project-id>

# Reconcile all projects
npm run reconcile
```

### **Verification:**
```bash
# Verify RBAC setup
npm run verify:rbac

# Verify Edge Functions
npx supabase functions list
```

## 🏗️ Setup Instructions

### **1. Master Project Setup:**
1. Apply migrations in `supabase/migrations/`
2. Configure variables in `.env`
3. Deploy Edge Functions

### **2. Slave Project Setup:**
1. Execute `docs/setup/SLAVE_SETUP_COMPLETO.sql` in Slave SQL Editor
2. Or run: `npm run slave:init`

### **3. Create Admin User:**
1. Execute `docs/setup/UPDATE_ADMIN_ROLE.sql` in Master SQL Editor

### **4. Start Frontend:**
```bash
cd frontend
npm start
```

## 📁 Project Structure

```
flouee-diagram-model/
├── frontend/                 # Angular 19 frontend
│   ├── src/app/
│   │   ├── components/       # UI components
│   │   ├── services/         # Business logic
│   │   └── modules/          # Feature modules
├── supabase/
│   ├── functions/            # Edge Functions (4 essential)
│   ├── migrations/           # Database migrations
│   └── config.toml          # Supabase config
├── scripts/                  # Utility scripts (13 essential)
├── docs/                     # Documentation
│   ├── setup/               # Setup guides
│   └── README.md            # Documentation index
└── tests/                   # Test files
```

## 🔒 Security Architecture

### **Data Isolation:**
- Each organization gets its own schema in Slave
- RLS policies ensure cross-tenant data protection
- JWT tokens contain organization context
- Edge Functions validate organization access

### **Role System:**
- **admin**: Super admin (all organizations)
- **org_admin**: Organization admin (own org)
- **client**: Regular user (assigned projects)

## 🚀 Deployment

### **Production Checklist:**
- [ ] Master project configured
- [ ] Slave project setup complete
- [ ] Edge Functions deployed
- [ ] Environment variables set
- [ ] Admin user created
- [ ] Tests passing
- [ ] Documentation updated

### **Environment Variables:**
```bash
# Master Project
SUPABASE_URL=https://cwbywxaafncyplgsrblw.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PROJECT_ID=cwbywxaafncyplgsrblw

# Slave Project (for Edge Functions)
SLAVE_URL=https://ffzufnwxvqngglsapqrf.supabase.co
SLAVE_SERVICE_ROLE_KEY=your_slave_service_role_key
```

## 📖 Documentation

- 📘 **Quick Start:** [START_HERE.md](./START_HERE.md)
- 📕 **System Status:** [SISTEMA_LISTO.md](./SISTEMA_LISTO.md)
- 📗 **Documentation:** [docs/README.md](./docs/README.md)
- 🏗️ **Architecture:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- ⚡ **Sync Architecture Guide:** [docs/SYNC_ARCHITECTURE.md](./docs/SYNC_ARCHITECTURE.md)
- 📙 **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Flouee Team**