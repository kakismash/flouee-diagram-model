# 🚀 START HERE - Quick Setup Guide

**Welcome to Flouee Diagram Model!** This guide will get you up and running in 5 minutes.

## ⚡ Quick Setup (5 minutes)

### **Step 1: Install Dependencies**
```bash
npm install
cd frontend && npm install
```

### **Step 2: Configure Environment**
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

### **Step 3: Setup Slave Database (REQUIRED)**
1. Go to [Slave SQL Editor](https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new)
2. Copy and paste the content from `docs/setup/SLAVE_SETUP_COMPLETO.sql`
3. Execute the SQL

### **Step 4: Start Frontend**
```bash
cd frontend
npm start
```

### **Step 5: Create Admin User**
1. Go to [Master SQL Editor](https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/sql/new)
2. Execute `docs/setup/UPDATE_ADMIN_ROLE.sql`

**🎉 You're ready! Go to http://localhost:4200**

---

## 🎯 What You Can Do

### **Create Projects**
- Design database schemas visually
- Add tables, columns, and relationships
- Real-time collaboration
- Automatic synchronization to Slave database

### **Multi-Tenant Architecture**
- Each organization gets isolated data
- Automatic schema creation
- Row-level security
- Role-based access control

### **Features**
- ✅ Drag-and-drop table designer
- ✅ Foreign key relationships
- ✅ Column types and constraints
- ✅ Real-time sync with database
- ✅ Optimistic locking
- ✅ Automatic rollback on errors

---

## 🔧 Useful Commands

### **Development:**
```bash
npm start                    # Start frontend
npm test                     # Run tests
npm run test:deep           # Comprehensive testing
```

### **Slave Management:**
```bash
npm run slave:init          # Initialize Slave
npm run slave:reset         # Reset Slave
npm run slave:init-fresh    # Fresh setup
```

### **Project Management:**
```bash
npm run apply-to-slave <id>  # Apply project to Slave
npm run delete-project <id>   # Delete with cleanup
npm run reconcile            # Reconcile all projects
```

### **Verification:**
```bash
npm run verify:rbac         # Check RBAC setup
npx supabase functions list  # List Edge Functions (should show apply-schema-change-atomic, inspect-slave-schema, verify-schema-sync)
```

---

## 🏗️ Architecture Overview

```
Master Project (Auth + Metadata)
├── Users & Organizations
├── Projects (JSON schemas) ← Source of Truth
├── Edge Functions
│   └→ apply-schema-change-atomic (Synchronous)
└→ Slave Project (User Data)
    └── Dynamic schemas per org
        └── Tables (t_xxx naming)
```

**Key:** All schema changes are applied **synchronously** to Master and Slave in a single atomic operation.

### **Projects:**
- **Master:** `cwbywxaafncyplgsrblw` - Auth, metadata, control
- **Slave:** `ffzufnwxvqngglsapqrf` - User data, dynamic schemas

---

## 🎯 Features Overview

### **✨ Core Features:**
- **Multi-tenant**: Complete data isolation
- **Synchronous sync**: Atomic schema changes to Master and Slave
- **Fail-fast**: If Slave fails, Master is not updated (consistency guaranteed)
- **ID-based naming**: Conflict-free table names (t_xxx, c_xxx)
- **Visual designer**: Drag-and-drop interface
- **Optimistic locking**: Concurrent editing support

### **✨ Security:**
- **Row Level Security**: Data isolation
- **Role-based access**: Admin, org_admin, client
- **JWT authentication**: Secure API access
- **Organization isolation**: Cross-tenant protection

### **✨ Schema Management:**
- **Table creation**: Visual designer
- **Column types**: Full PostgreSQL support
- **Constraints**: Primary keys, unique, nullable
- **Relationships**: Foreign key management
- **Real-time sync**: Changes applied immediately

---

## 🚨 Troubleshooting

### **Common Issues:**

**1. "Schema does not exist" error:**
- Run: `npm run slave:init`
- Or execute `SLAVE_SETUP_COMPLETO.sql` manually

**2. "Unauthorized" error:**
- Check `.env` file configuration
- Verify Supabase credentials

**3. "Edge Function not found":**
- Run: `npm run deploy-functions`
- Check: `npx supabase functions list`

**4. "RLS policy error":**
- Run: `npm run verify:rbac`
- Check organization setup

### **Getting Help:**
1. Check [README.md](./README.md) for detailed docs
2. Review [SYSTEM_READY.md](./SYSTEM_READY.md) for system status
3. Run `npm run test:deep` to verify everything works

---

## 📖 Next Steps

1. **Explore the UI** - Create your first project
2. **Read the docs** - [docs/README.md](./docs/README.md)
3. **Run tests** - `npm run test:deep`
4. **Check system status** - [SYSTEM_READY.md](./SYSTEM_READY.md)

---

**🎉 Welcome to Flouee Diagram Model!**