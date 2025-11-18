# 📚 Documentation - Flouee Diagram Model

This folder contains all technical documentation for the project.

## 📖 Main Documents

### **Architecture:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) ⭐ - Complete architecture overview
- [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md) - Detailed technical synchronous guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration guide from async system
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference

### **Setup and Configuration:**
- [SLAVE_SETUP_COMPLETO.sql](./setup/SLAVE_SETUP_COMPLETO.sql) - Complete Slave setup
- [MASTER_CONFIGURE_JWT_HOOK.md](./setup/MASTER_CONFIGURE_JWT_HOOK.md) - JWT configuration in Master
- [UPDATE_ADMIN_ROLE.sql](./setup/UPDATE_ADMIN_ROLE.sql) - Create admin user

### **APIs and References:**
- [INSPECT_SLAVE_SCHEMA_API.md](./INSPECT_SLAVE_SCHEMA_API.md) - Schema inspection API

## 🏗️ Architecture

### **Synchronous Master-Slave System:**
```
Master Project (Auth + Metadata)
├── Supabase Auth
├── Users & Organizations
├── Projects (JSON schemas) ← Source of Truth
├── Schema Changes (audit)
└── Edge Functions
    └→ apply-schema-change-atomic (Synchronous)
        └→ Slave Project (User Data)
            └── Dynamic schemas per org
                └── Tables (t_xxx naming)
```

**Key Principle:** All schema changes are applied **synchronously** to Master and Slave in a single atomic operation. If Slave fails, Master is NOT updated (fail-fast).

📚 **See detailed documentation:**
- [General Architecture](./ARCHITECTURE.md)
- [Technical Synchronous Guide](./SYNC_ARCHITECTURE.md)

### **Supabase Projects:**
- **Master:** `cwbywxaafncyplgsrblw` - Control and authentication
- **Slave:** `ffzufnwxvqngglsapqrf` - User data

## 🔧 Configuration

### **Required Environment Variables:**
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

## 🌐 Edge Functions

### **Active Functions:**
1. **`apply-schema-change-atomic`** ⭐ - **Main schema changes (Synchronous)**
2. **`inspect-slave-schema`** - Inspection and debug
3. **`verify-schema-sync`** - Synchronization verification

### **Synchronous Architecture:**
- ✅ Applies changes **synchronously** to Master and Slave
- ✅ **Fail-fast**: If Slave fails, Master is NOT updated
- ✅ Validation and normalization before applying
- ✅ Optimistic lock prevents concurrent conflicts

### **Deploy:**
```bash
npm run deploy-functions
# Or specific:
npx supabase functions deploy apply-schema-change-atomic
```

## 🔒 Security

### **Row Level Security:**
- Active on all Master tables
- Policies by organization
- Complete data isolation

### **Roles:**
- **admin**: Super administrator
- **org_admin**: Organization administrator
- **client**: Regular user

## 📊 Management Scripts

### **Slave Management:**
```bash
npm run slave:init          # Initialize Slave
npm run slave:reset         # Complete reset
npm run slave:init-fresh    # Fresh setup
```

### **Project Management:**
```bash
npm run apply-to-slave <id>  # Apply project
npm run delete-project <id>   # Delete project
npm run reconcile            # Reconcile all
```

### **Testing:**
```bash
npm run test:deep           # Deep testing
npm run test:e2e            # E2E testing
npm run verify:rbac         # Verify RBAC
```

## 🚀 Deployment

### **Production Checklist:**
- [ ] Master project configured
- [ ] Slave project setup complete
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] Admin user created
- [ ] Tests passing
- [ ] Documentation updated

## 🔍 Troubleshooting

### **Common Issues:**

**1. "Schema does not exist":**
- Run `SLAVE_SETUP_COMPLETO.sql` on Slave
- Or run: `npm run slave:init`

**2. "Unauthorized":**
- Verify environment variables
- Check Supabase credentials

**3. "Edge Function not found":**
- Deploy: `npm run deploy-functions`
- Verify: `npx supabase functions list`

**4. "RLS policy error":**
- Verify: `npm run verify:rbac`
- Check organization setup

## 📈 Monitoring

### **Key Metrics:**
- Edge Function response time
- Synchronization success rate
- Locked projects
- RLS errors

### **Important Logs:**
- Edge Function logs in Supabase Dashboard
- `schema_changes` table for auditing
- Frontend logs for debugging

## 🤝 Contributing

1. Read complete documentation
2. Run tests: `npm run test:deep`
3. Verify changes in Slave
4. Update documentation if necessary

---

**📚 Documentation maintained by the Flouee team**
