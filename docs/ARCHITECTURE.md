# 🏗️ System Architecture

## 📋 Summary

Flouee Diagram Model uses a **synchronous Master-Slave architecture** where all schema changes are applied atomically and synchronously to both systems (Master and Slave) in a single operation.

---

## 🎯 Design Principles

### **1. Synchronous Synchronization (Fail-Fast)**
- ✅ All changes are applied **synchronously** to Master and Slave
- ✅ If Slave fails, Master is **NOT** updated (fail-fast)
- ✅ Master is the **single source of truth**
- ✅ No asynchronous events or processing queues

### **2. Atomicity**
- ✅ Each schema change is **atomic**: either fully applied or not applied
- ✅ Optimistic lock on Master prevents concurrent conflicts
- ✅ Automatic rollback if any step fails

### **3. Versioning**
- ✅ Each project has a `version` that increments with each change
- ✅ Optimistic locking prevents concurrent editing conflicts
- ✅ Complete history in `schema_changes` table

---

## 🔄 Operation Flow

### **Schema Change Flow:**

```
┌─────────────┐
│   Frontend  │
│  (Angular)  │
└──────┬──────┘
       │
       │ 1. applySchemaChange()
       ▼
┌─────────────────────────────────────┐
│  EventDrivenSchemaService            │
│  (frontend/src/app/services/)       │
└──────┬───────────────────────────────┘
       │
       │ 2. HTTP POST
       ▼
┌─────────────────────────────────────┐
│  apply-schema-change-atomic         │
│  (Edge Function - Master)           │
└──────┬───────────────────────────────┘
       │
       ├─► 3a. Validate change
       ├─► 3b. Acquire lock (Master)
       ├─► 3c. Get Slave config
       ├─► 3d. Generate SQL
       │
       ├─► 4. Apply to Slave ⚠️
       │   └─► If fails → Rollback lock, return error
       │
       ├─► 5. If Slave OK → Update Master
       └─► 6. Log to schema_changes
```

### **Execution Order:**

1. **Validation**: Change is validated and normalized
2. **Lock**: Optimistic lock is acquired on Master
3. **Slave Config**: Slave configuration is obtained from `deployment_configs`
4. **SQL Generation**: Specific SQL is generated for the change
5. **Slave Application** ⚠️: SQL is applied to Slave **FIRST** (fail-fast)
6. **Master Update**: Only if Slave succeeded, Master is updated
7. **Audit Log**: Logged in `schema_changes` for auditing

---

## 🗄️ Data Structure

### **Master Database (cwbywxaafncyplgsrblw)**

```
organizations
├── id (UUID)
├── name, slug
└── subscription_tier

deployment_configs
├── id (UUID)
├── organization_id (UUID, nullable)  -- NULL = shared deployment
├── supabase_project_url
├── supabase_anon_key
├── supabase_service_role_key
└── status ('active' | 'migrating' | 'inactive')

projects
├── id (UUID)
├── organization_id (UUID)
├── name, description
├── schema_data (JSONB)  -- ← Source of Truth
├── version (INTEGER)     -- ← Optimistic locking
├── status ('ready' | 'applying')
├── locked_by, locked_at
└── last_applied_version

schema_changes  -- ← Audit log
├── id (UUID)
├── organization_id, project_id
├── change_type
├── change_data (JSONB)
├── old_value, new_value (JSONB)
├── sql_executed (TEXT)
├── status ('applied')
└── applied_at
```

### **Slave Database (ffzufnwxvqngglsapqrf)**

```
org_<organization_id_without_dashes>/
├── t_<table_id>/          -- User tables
│   ├── c_<column_id>
│   └── Foreign keys
│
└── __schema_metadata/     -- Metadata table
    ├── project_id
    ├── version
    ├── schema_hash
    └── status
```

---

## 🔐 Security and Isolation

### **Multi-Tenancy:**
- Each organization has its own schema: `org_<uuid_without_dashes>`
- Row Level Security (RLS) on Master by organization
- RLS on Slave by schema (complete isolation)

### **Roles and Permissions:**
- `admin`: Super administrator (access to everything)
- `org_admin`: Organization administrator
- `client`: Regular user

---

## 🌐 Edge Functions

### **Main Function:**

| Function | Description | Status |
|----------|-------------|--------|
| `apply-schema-change-atomic` | Applies changes synchronously to Master and Slave | ✅ Active |

### **Helper Functions:**

| Function | Description | Status |
|----------|-------------|--------|
| `inspect-slave-schema` | Schema inspection and debug | ✅ Active |
| `verify-schema-sync` | Synchronization verification | ✅ Active |

### **Obsolete Functions (Do not use):**

| Function | Status | Note |
|----------|--------|------|
| `process-events` | ❌ Obsolete | Asynchronous system removed |
| `apply-schema-change` | ⚠️ Legacy | Use `apply-schema-change-atomic` |

---

## 📝 Supported Change Types

### **Tables:**
- `add_table` - Create table
- `drop_table` - Delete table

### **Columns:**
- `add_column` - Add column
- `drop_column` - Delete column
- `alter_column_nullable` - Change nullable
- `alter_column_default` - Change default value

### **Relationships:**
- `add_foreign_key` - Add foreign key
- `drop_foreign_key` - Delete foreign key

### **Constraints:**
- `add_unique_constraint` - Add unique constraint
- `drop_unique_constraint` - Delete unique constraint

---

## 🚨 Error Handling

### **Common Errors:**

1. **409 Conflict**: Project version changed (optimistic lock)
   - **Solution**: Reload project and retry

2. **423 Locked**: Project locked by another user
   - **Solution**: Wait or retry with backoff

3. **500 Slave Error**: Failed to apply to Slave
   - **Result**: Master is NOT updated (fail-fast)
   - **Solution**: Review Slave logs, fix error, retry

### **Retry Logic (Frontend):**
- Frontend automatically retries on 409/423 cases
- Exponential backoff: 200ms, 400ms, 800ms
- Maximum 3 attempts

---

## 📊 Auditing

### **`schema_changes` Table:**
- Records **all** applied changes
- Fields: `change_type`, `change_data`, `old_value`, `new_value`, `sql_executed`
- Ordered by `applied_at DESC`

### **History Query:**
```typescript
await eventDrivenSchema.getSchemaChangesHistory(projectId, 20);
```

---

## 🔄 Migration from Asynchronous System

The previous system used asynchronous events (`events`, `process-events`). The new architecture is completely synchronous.

### **Changes:**
- ❌ Removed: `process-events` Edge Function
- ❌ Removed: `events` table (kept for historical auditing)
- ✅ New: Synchronous flow with fail-fast
- ✅ New: Change validation and normalization
- ✅ New: History in `schema_changes`

### **Compatibility:**
- Frontend maintains legacy methods for compatibility
- Use `applySchemaChange()` directly for better control

---

## 🎯 Advantages of the New Architecture

1. **Simplicity**: Single endpoint, linear flow
2. **Reliability**: Fail-fast guarantees consistency
3. **Debugging**: Easier to debug, linear operation
4. **Performance**: No overhead from asynchronous events
5. **Atomicity**: Changes are always atomic or fail completely

---

## 🎨 Design System Architecture

### Overview

The application uses a centralized Design System for consistent, theme-aware UI components. All components follow design tokens and CSS variables that automatically adapt to the current theme.

### Structure

```
frontend/src/app/
├── design-system/
│   ├── design-system.config.ts      # Configuration (sizes, spacing, etc.)
│   ├── design-system.tokens.ts      # Design tokens → CSS variables
│   └── README.md                     # Design system documentation
├── components/
│   └── design-system/               # Base reusable components
│       ├── base-button/             # Core button component
│       ├── badge/                   # Status badges
│       ├── chip/                    # Tags/chips
│       ├── card/                    # Card container
│       ├── empty-state/             # Empty state placeholder
│       ├── loading-spinner/         # Loading indicator
│       ├── divider/                 # Section dividers
│       └── spacer/                  # Spacing utility
└── services/
    └── design-tokens.service.ts     # Service to access design tokens
```

### Design Tokens

All design tokens map to CSS variables from the theme system:

```typescript
// Example: Color tokens
designTokens.colors.primary        // → var(--theme-primary)
designTokens.colors.textPrimary    // → var(--theme-text-primary)
designTokens.button.background     // → var(--theme-button-background)

// Example: Spacing tokens
var(--ds-spacing-md)  // → 16px
var(--ds-radius-medium) // → 8px
```

### Component Principles

1. **Theme-Aware**: All components use CSS variables, never hardcoded colors
2. **Configurable**: Components accept size, variant, and other props
3. **Accessible**: Follow WCAG 2.1 AA standards with proper ARIA attributes
4. **Composable**: Components can be combined to create complex UIs
5. **Responsive**: Mobile-first design approach
6. **Type-Safe**: Full TypeScript typing with interfaces

### Usage Example

```typescript
import { BaseButtonComponent } from './components/design-system/base-button/base-button.component';

// In template
<ds-base-button
  label="Click me"
  icon="add"
  variant="primary"
  size="medium"
  shape="square"
  (clicked)="handleClick($event)">
</ds-base-button>
```

### Table View Integration

The Table View uses Design System components for:
- Filter controls (`ds-base-button`, `ds-chip`)
- Sort controls (`ds-base-button`, `ds-chip`)
- Column management (Material components + Design System styles)
- Toolbar actions (Design System components)

See [Design System Documentation](./DESIGN_SYSTEM.md) for detailed component catalog.

---

## 📚 References

- [Main README](../../README.md)
- [Setup Guide](./setup/SLAVE_SETUP_COMPLETO.sql)
- [Edge Function API](./INSPECT_SLAVE_SCHEMA_API.md)
- [Design System Documentation](./DESIGN_SYSTEM.md)
- [Table View Documentation](./TABLE_VIEW.md)
