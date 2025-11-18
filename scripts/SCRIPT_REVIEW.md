# Scripts Review and Analysis

**Date:** 2025-01-20  
**Purpose:** Review all scripts in the `scripts/` directory to identify usage, dependencies, and potential cleanup opportunities.

## Summary

- **Total Scripts:** 13
- **In package.json:** 12
- **Not in package.json:** 1 (`apply-slave-rpc-functions.js`)
- **Status:** Most scripts are actively used. One script may be obsolete.

---

## Script Inventory

### ✅ Active Scripts (12 in package.json)

| Script | Package.json Command | Purpose | Status |
|--------|---------------------|---------|--------|
| `apply-migrations.js` | `npm run migrate` | Apply database migrations | ✅ Active |
| `apply-project-schema-to-slave.js` | `npm run apply-to-slave` | Apply project schema to Slave | ✅ Active |
| `clone-slave-project.js` | `npm run slave:clone` | Clone Slave project template | ✅ Active |
| `deep-test-schema-system.js` | `npm run test:deep` | Deep testing of schema system | ✅ Active |
| `delete-project-with-cleanup.js` | `npm run delete-project` | Delete project with cleanup | ✅ Active |
| `init-fresh-system.js` | `npm run slave:init-fresh` | Initialize fresh system with test data | ✅ Active |
| `init-slave-from-zero.js` | `npm run slave:init` | Initialize new Slave from zero | ✅ Active |
| `reconcile-all-projects.js` | `npm run reconcile` | Reconcile all projects | ✅ Active |
| `reset-and-init-slave.js` | `npm run slave:reset` | Reset and initialize Slave | ✅ Active |
| `sql-to-clipboard.js` | `npm run setup-sql` | SQL utility for clipboard | ✅ Active |
| `test-e2e-schema-changes.js` | `npm run test:e2e` | E2E testing of schema changes | ✅ Active |
| `verify-rbac-setup.js` | `npm run verify:rbac` | Verify RBAC setup | ✅ Active |

### ❓ Script Requiring Review (1 not in package.json)

| Script | Status | Notes |
|--------|--------|-------|
| `apply-slave-rpc-functions.js` | ⚠️ **Potentially Obsolete** | RPC functions are in migration `20250120_create_read_table_data_rpc.sql` |

---

## Detailed Analysis

### 1. `apply-slave-rpc-functions.js` - Potentially Obsolete

**Current Status:**
- ❌ Not in `package.json`
- 📄 Reads from `docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql`
- 🔄 Applies RPC functions: `read_table_data`, `insert_table_record`, `update_table_record`, `delete_table_record`

**Findings:**
- ✅ RPC functions ARE defined in migration: `supabase/migrations/20250120_create_read_table_data_rpc.sql`
- ✅ `read_table_data` is still used in `frontend/src/app/services/slave-data.service.ts` (for initial data load)
- ❌ `insert_table_record`, `update_table_record`, `delete_table_record` are NO LONGER USED (replaced by REST methods)
- ⚠️ The script reads from `docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql` which duplicates the migration

**Recommendation:**
- **Option A (Recommended):** Remove the script since functions are in migrations. Migrations are the proper way to manage database schema.
- **Option B:** Keep script but update it to only apply `read_table_data` if needed for manual setup (not recommended).

**Action:** Mark as obsolete and remove from codebase.

---

### 2. Init Scripts - Different Purposes, Some Overlap

#### `init-slave-from-zero.js`
**Purpose:** Initialize a NEW Slave project from scratch  
**What it does:**
- Creates `exec_sql` function
- Creates auth helper functions (`current_organization_id`, `current_user_id`, `current_user_role`)
- Verifies functions exist

**Use Case:** Setting up a brand new Slave project

#### `reset-and-init-slave.js`
**Purpose:** Reset an EXISTING Slave project  
**What it does:**
- Drops ALL organization schemas
- Verifies functions exist (doesn't create them)
- Recreates fresh schemas for all organizations
- Optionally re-applies projects from Master

**Use Case:** Resetting a Slave to clean state while keeping functions

#### `init-fresh-system.js`
**Purpose:** Complete fresh system initialization with test data  
**What it does:**
- Cleans all Slave schemas
- Sets up Slave with required functions
- Creates realistic test data
- Creates use case projects
- Applies all schemas to Slave

**Use Case:** Development/testing - complete fresh start with sample data

**Analysis:**
- ✅ All three scripts serve different purposes
- ⚠️ Some overlap in function creation, but acceptable
- ✅ No consolidation needed - they're all useful

---

## RPC Functions Usage Analysis

### Functions Still Used:
- ✅ `read_table_data` - Used in `slave-data.service.ts` for initial data load before realtime takes over

### Functions No Longer Used:
- ❌ `insert_table_record` - Replaced by `.schema().from().insert()`
- ❌ `update_table_record` - Replaced by `.schema().from().update()`
- ❌ `delete_table_record` - Replaced by `.schema().from().delete()`

**Note:** The unused RPC functions are still in the migration file but could be removed in a future cleanup if desired.

---

## Recommendations

### Immediate Actions:
1. ✅ **Remove `apply-slave-rpc-functions.js`** - Functions are in migrations
2. ✅ **Keep all init scripts** - They serve different purposes
3. ✅ **All other scripts are actively used** - No changes needed

### Future Considerations:
1. Consider removing unused RPC functions (`insert_table_record`, `update_table_record`, `delete_table_record`) from migration if they're truly not needed
2. Consider migrating `read_table_data` to use standard REST methods if PostgREST schema exposure is properly configured

---

## Script Dependencies

### Scripts that depend on other scripts:
- None (all scripts are independent)

### Scripts that depend on migrations:
- `apply-migrations.js` - Applies migrations from `supabase/migrations/`
- `apply-slave-rpc-functions.js` - Would apply RPC functions (but obsolete)

### Scripts that depend on SQL files:
- `apply-slave-rpc-functions.js` - Reads from `docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql` (obsolete)

---

## Documentation Status

### Current Documentation:
- ✅ `scripts/README.md` - Exists but needs update
- ✅ `package.json` - All active scripts documented
- ✅ `SYSTEM_READY.md` - Lists scripts

### Needed Updates:
- Update `scripts/README.md` to reflect current script status
- Remove references to `apply-slave-rpc-functions.js` from documentation

---

## Conclusion

**Summary:**
- 12 of 13 scripts are actively used and properly registered in `package.json`
- 1 script (`apply-slave-rpc-functions.js`) is obsolete and should be removed
- All init scripts serve different purposes and should be kept
- RPC functions are properly managed via migrations

**Action Items:**
1. Remove `apply-slave-rpc-functions.js`
2. Update `scripts/README.md`
3. Update any documentation that references the removed script

