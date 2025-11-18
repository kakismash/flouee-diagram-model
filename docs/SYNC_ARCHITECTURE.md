# ⚡ Synchronous Architecture - Technical Guide

## 🎯 Overview

The system uses a **synchronous fail-fast model** where each schema change is applied atomically to Master and Slave in a single operation. If Slave fails, the change is not applied to Master, maintaining consistency.

---

## 🔄 Detailed Flow

### **1. Frontend → Edge Function**

```typescript
// frontend/src/app/services/event-driven-schema.service.ts
await this.supabase.client.functions.invoke('apply-schema-change-atomic', {
  body: {
    organization_id: string,
    project_id: string,
    change: {
      type: 'add_table' | 'drop_table' | 'add_column' | ...,
      // ... change-specific data
    },
    new_schema_data: ProjectSchema,
    current_version: number,
    user_id: string
  }
});
```

### **2. Edge Function: Validation**

```typescript
// supabase/functions/apply-schema-change-atomic/index.ts

// 1. Validate input
if (!organization_id || !project_id || !change || !new_schema_data) {
  return { success: false, error: 'Missing required fields' };
}

// 2. Normalize and validate change
const validation = normalizeAndValidateChange(change);
if (!validation.valid) {
  return { success: false, error: validation.error };
}
```

### **3. Edge Function: Optimistic Lock**

```typescript
// Acquire lock ONLY (without updating schema_data yet)
await masterClient
  .from('projects')
  .update({
    status: 'applying',
    locked_by: user_id,
    locked_at: new Date().toISOString()
  })
  .eq('id', project_id)
  .eq('version', current_version)  // ← Optimistic lock
  .eq('status', 'ready');           // Only if ready
```

### **4. Edge Function: Slave Configuration**

```typescript
// Get configuration from deployment_configs
const slaveConfig = await getSlaveConfig(masterClient, organization_id);

// Validate configuration
validateSlaveConfig(slaveConfig);

// Create Slave client
const slaveClient = createClient(
  slaveConfig.supabase_project_url,
  slaveConfig.supabase_service_role_key || slaveConfig.supabase_anon_key
);
```

### **5. Edge Function: SQL Generation**

```typescript
const schemaName = getSchemaName(organization_id);  // org_<uuid>
const sql = generateSQL(normalizedChange, organization_id);

// Examples:
// add_table: CREATE TABLE IF NOT EXISTS org_xxx.t_yyy (...);
// add_column: ALTER TABLE org_xxx.t_yyy ADD COLUMN IF NOT EXISTS c_zzz ...;
// drop_table: DROP TABLE IF EXISTS org_xxx.t_yyy CASCADE;
```

### **6. Edge Function: Application to Slave ⚠️**

```typescript
try {
  // Ensure schema exists
  await slaveClient.rpc('exec_sql', {
    query: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
  });

  // Apply SQL change
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await slaveClient.rpc('exec_sql', { query: statement.trim() + ';' });
    }
  }

  console.log('✅ Change applied to Slave successfully');
} catch (error) {
  // ⚠️ ROLLBACK: If Slave fails, revert Master lock
  await masterClient
    .from('projects')
    .update({
      status: 'ready',
      locked_by: null,
      locked_at: null
    })
    .eq('id', project_id);

  return {
    success: false,
    error: `Failed to apply change to Slave: ${error.message}`
  };
}
```

### **7. Edge Function: Master Update**

```typescript
// Only if Slave succeeded, update Master
await masterClient
  .from('projects')
  .update({
    schema_data: new_schema_data,
    version: newVersion,
    status: 'ready',
    locked_by: null,
    last_applied_version: newVersion
  })
  .eq('id', project_id)
  .eq('version', current_version);  // Double-check version
```

### **8. Edge Function: Auditing**

```typescript
// Log to schema_changes
await masterClient
  .from('schema_changes')
  .insert({
    organization_id,
    project_id,
    change_type: normalizedChange.type,
    change_data: normalizedChange,
    old_value: oldSchemaData,
    new_value: new_schema_data,
    status: 'applied',
    sql_executed: sql,
    applied_at: new Date().toISOString(),
    created_by: user_id
  });
```

---

## 🛡️ Change Validation

### **Function `normalizeAndValidateChange()`:**

```typescript
function normalizeAndValidateChange(change: any): ChangeValidationResult {
  // 1. Validate basic structure
  if (!change || typeof change !== 'object') {
    return { valid: false, error: 'Change object is required' };
  }

  // 2. Validate type
  const type = change.type;
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Change type is required' };
  }

  // 3. Normalize based on type (e.g., change.table vs change.data.table)
  let normalized: any = { type };
  
  switch (type) {
    case 'add_table':
      normalized.table = change.table || change.data?.table;
      if (!normalized.table) {
        return { valid: false, error: 'Table definition required' };
      }
      break;
    // ... other types
  }

  return { valid: true, normalizedChange: normalized };
}
```

---

## 🗄️ Slave Configuration

### **`deployment_configs` Table:**

```sql
SELECT * FROM deployment_configs
WHERE organization_id = '<org_id>' OR organization_id IS NULL
ORDER BY organization_id DESC NULLS LAST
LIMIT 1;
```

**Logic:**
1. Search for organization-specific configuration
2. If not found, use shared configuration (`organization_id IS NULL`)
3. Validate that `status = 'active'`

---

## 🔐 Optimistic Locking

### **Mechanism:**

```typescript
// Client A (version 5) attempts update
await masterClient
  .from('projects')
  .update({ version: 6, ... })
  .eq('id', project_id)
  .eq('version', 5);  // ← Only updates if version = 5

// If Client B already updated to version 6:
// → Update returns 0 rows → Conflict detected
```

### **Frontend Handling:**

```typescript
// Automatic retry with exponential backoff
const invokeWithRetry = async (maxAttempts = 3) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await invoke();
    if (!error && data.success) return { data, error };
    
    const status = error?.status;
    if (status === 409 || status === 423) {
      // Conflict or locked → retry
      await sleep(200 * Math.pow(2, attempt));
      continue;
    }
    break;
  }
};
```

---

## 🚨 Error Handling

### **Error Codes:**

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Validation failed | Check change format |
| 404 | Project not found | Verify project_id |
| 409 | Version conflict | Reload project, retry |
| 423 | Project locked | Wait or retry |
| 500 | Slave error | Review logs, fix error |

### **Logging:**

```typescript
// Edge Function logs (Supabase Dashboard)
console.log('✅ Lock acquired');
console.log('✅ Change applied to Slave successfully');
console.error('❌ Failed to apply change to Slave:', error);
console.log('🎉 Atomic change completed successfully');
```

---

## 📊 Monitoring

### **Key Metrics:**

1. **Success rate**: Changes applied / Total attempts
2. **Response time**: From frontend to confirmation
3. **Errors by type**: 409, 423, 500, etc.
4. **Changes per project**: `schema_changes` by `project_id`

### **Useful Queries:**

```sql
-- Recent changes
SELECT * FROM schema_changes
WHERE project_id = '<project_id>'
ORDER BY applied_at DESC
LIMIT 20;

-- Recent errors (if error logging exists)
SELECT * FROM schema_changes
WHERE status != 'applied'
ORDER BY applied_at DESC;

-- Project versions
SELECT id, name, version, last_applied_version, status
FROM projects
WHERE organization_id = '<org_id>';
```

---

## 🔧 Testing

### **Test Flow:**

1. Create project
2. Create table → Verify in Slave
3. Add column → Verify in Slave
4. Modify column → Verify in Slave
5. Delete column → Verify in Slave
6. Add foreign key → Verify in Slave
7. Delete table → Verify in Slave

### **Slave Verification:**

```sql
-- List schemas
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'org_%';

-- List tables in schema
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'org_<uuid>';

-- View table structure
\d org_<uuid>.t_<table_id>
```

---

## 📝 Implementation Notes

### **Decision: Synchronous vs Asynchronous**

**Reasons for synchronous:**
- ✅ Simplicity: Single endpoint, linear flow
- ✅ Reliability: Fail-fast guarantees consistency
- ✅ Debugging: Easier to debug
- ✅ Latency: No overhead from events/queues

**Trade-offs:**
- ⚠️ If Slave is down, no changes can be applied
- ⚠️ Timeout on Edge Functions (60s default)

### **Future Enhancements:**

1. **Automatic retry in Edge Function**: For transient Slave errors
2. **Optional queue**: For changes that don't require immediate response
3. **Batch operations**: Apply multiple changes in one transaction

---

## 📚 References

- [Architecture Overview](./ARCHITECTURE.md)
- [Edge Function Code](../../supabase/functions/apply-schema-change-atomic/index.ts)
- [Frontend Service](../../frontend/src/app/services/event-driven-schema.service.ts)
