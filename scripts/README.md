# Scripts Directory

This directory contains utility scripts for managing the Flouee Diagram Model system.

## 📋 Scripts Overview

All scripts are registered in `package.json` and can be run using npm commands.

### Database & Migration Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `apply-migrations.js` | `npm run migrate` | Apply database migrations from `supabase/migrations/` |
| `apply-project-schema-to-slave.js` | `npm run apply-to-slave` | Apply a project's schema to the Slave database |

### Slave Management Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `init-slave-from-zero.js` | `npm run slave:init` | Initialize a new Slave project from scratch (creates exec_sql and auth helpers) |
| `reset-and-init-slave.js` | `npm run slave:reset` | Reset an existing Slave (drops schemas, recreates, optionally applies projects) |
| `reset-and-init-slave.js --apply-projects` | `npm run slave:reset-apply` | Reset Slave and re-apply all projects |
| `init-fresh-system.js` | `npm run slave:init-fresh` | Complete fresh system initialization with test data |
| `clone-slave-project.js` | `npm run slave:clone` | Clone Slave project template (interactive wizard) |

### Testing Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `deep-test-schema-system.js` | `npm run test:deep` | Deep testing of the schema system |
| `test-e2e-schema-changes.js` | `npm run test:e2e` | End-to-end testing of schema changes |
| `verify-rbac-setup.js` | `npm run verify:rbac` | Verify RBAC (Role-Based Access Control) setup |

### Utility Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `sql-to-clipboard.js` | `npm run setup-sql` | SQL utility for copying SQL to clipboard |
| `delete-project-with-cleanup.js` | `npm run delete-project` | Delete a project with proper cleanup |
| `reconcile-all-projects.js` | `npm run reconcile` | Reconcile all projects between Master and Slave |

---

## 🚀 Quick Start

### Initialize a New Slave Project

```bash
# Initialize a new Slave from zero
npm run slave:init

# Or specify a project reference
node scripts/init-slave-from-zero.js <project-ref>
```

### Reset an Existing Slave

```bash
# Reset Slave (drops schemas, recreates)
npm run slave:reset

# Reset and re-apply all projects
npm run slave:reset-apply
```

### Apply Migrations

```bash
# Apply all pending migrations
npm run migrate
```

### Testing

```bash
# Deep test the schema system
npm run test:deep

# E2E test schema changes
npm run test:e2e

# Verify RBAC setup
npm run verify:rbac
```

---

## 📝 Script Details

### Init Scripts Comparison

#### `init-slave-from-zero.js`
- **Purpose:** Initialize a NEW Slave project
- **What it does:**
  - Creates `exec_sql` function
  - Creates auth helper functions (`current_organization_id`, `current_user_id`, `current_user_role`)
  - Verifies functions exist
- **Use Case:** Setting up a brand new Slave project

#### `reset-and-init-slave.js`
- **Purpose:** Reset an EXISTING Slave project
- **What it does:**
  - Drops ALL organization schemas
  - Verifies functions exist (doesn't create them - assumes they already exist)
  - Recreates fresh schemas for all organizations
  - Optionally re-applies projects from Master
- **Use Case:** Resetting a Slave to clean state while keeping functions

#### `init-fresh-system.js`
- **Purpose:** Complete fresh system initialization with test data
- **What it does:**
  - Cleans all Slave schemas
  - Sets up Slave with required functions
  - Creates realistic test data
  - Creates use case projects (E-commerce, CRM, etc.)
  - Applies all schemas to Slave
- **Use Case:** Development/testing - complete fresh start with sample data

---

## 🔧 Requirements

All scripts require:
- Node.js (ES modules)
- Environment variables configured (`.env` file):
  - `SUPABASE_URL` or `SUPABASE_MASTER_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_MASTER_SERVICE_ROLE_KEY`

---

## 📚 Related Documentation

- **Script Review:** See `scripts/SCRIPT_REVIEW.md` for detailed analysis
- **System Setup:** See `SYSTEM_READY.md` for system overview
- **Migrations:** See `supabase/migrations/` for database migrations

---

## ⚠️ Notes

- All scripts are idempotent (safe to run multiple times)
- Scripts use the Master database to get Slave connection info from `deployment_configs` table
- RPC functions are managed via migrations (see `supabase/migrations/20250120_create_read_table_data_rpc.sql`)

---

## 🔄 Script Maintenance

For script review and cleanup, see `scripts/SCRIPT_REVIEW.md`.

**Last Updated:** 2025-01-20
