# ⚡ Quick Reference Guide

## 🔄 Schema Change Flow

```
User makes change → Frontend → apply-schema-change-atomic → Slave → Master → ✅
```

### **Execution Order:**
1. Validate change
2. Acquire lock on Master
3. Get Slave configuration
4. Generate SQL
5. **Apply to Slave first** ⚠️
6. If Slave OK → Update Master
7. Log to schema_changes

---

## 📝 Change Types

| Type | Description | Example |
|------|-------------|---------|
| `add_table` | Create table | `{ type: 'add_table', table: {...} }` |
| `drop_table` | Delete table | `{ type: 'drop_table', table_name: 't_users' }` |
| `add_column` | Add column | `{ type: 'add_column', table_name: 't_users', column: {...} }` |
| `drop_column` | Delete column | `{ type: 'drop_column', table_name: 't_users', column_name: 'c_email' }` |
| `add_foreign_key` | Add FK | `{ type: 'add_foreign_key', foreign_key: {...} }` |
| `drop_foreign_key` | Delete FK | `{ type: 'drop_foreign_key', foreign_key: {...} }` |
| `add_unique_constraint` | Add unique | `{ type: 'add_unique_constraint', table_name: 't_users', column_name: 'c_email' }` |
| `drop_unique_constraint` | Delete unique | `{ type: 'drop_unique_constraint', table_name: 't_users', column_name: 'c_email' }` |
| `alter_column_nullable` | Change nullable | `{ type: 'alter_column_nullable', table_name: 't_users', column_name: 'c_email', nullable: false }` |
| `alter_column_default` | Change default | `{ type: 'alter_column_default', table_name: 't_users', column_name: 'c_email', new_default: 'unknown@example.com' }` |

---

## 🔧 Frontend Code

### **Apply Change:**
```typescript
await eventDrivenSchema.applySchemaChange(
  projectId,
  { type: 'add_table', table: tableData },
  newSchemaData,
  currentVersion
);
```

### **Create Table:**
```typescript
await eventDrivenSchema.createTable(
  projectId,
  tableData,
  newSchemaData,
  currentVersion
);
```

### **Get History:**
```typescript
const history = await eventDrivenSchema.getSchemaChangesHistory(projectId, 20);
```

---

## 🗄️ Slave Configuration

### **Get from deployment_configs:**
```sql
SELECT * FROM deployment_configs
WHERE organization_id = '<org_id>' OR organization_id IS NULL
ORDER BY organization_id DESC NULLS LAST
LIMIT 1;
```

### **Priority:**
1. Organization-specific configuration
2. Shared configuration (`organization_id IS NULL`)

---

## 🚨 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Validation failed | Check change format |
| 404 | Project not found | Verify project_id |
| 409 | Version conflict | Reload project, retry |
| 423 | Project locked | Wait or retry |
| 500 | Slave error | Review logs, fix error |

---

## 📊 Monitoring

### **View recent changes:**
```sql
SELECT * FROM schema_changes
WHERE project_id = '<project_id>'
ORDER BY applied_at DESC
LIMIT 20;
```

### **View projects:**
```sql
SELECT id, name, version, status, last_applied_version
FROM projects
WHERE organization_id = '<org_id>';
```

---

## 🔗 Useful Links

- **Master SQL Editor**: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/sql/new
- **Slave SQL Editor**: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/functions

---

## 📚 Complete Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Sync Architecture Technical Guide](./SYNC_ARCHITECTURE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
