# 🔄 Migration Guide: Async Events → Synchronous Architecture

## Overview

This guide helps you understand the migration from the async event-driven system to the new synchronous architecture.

---

## What Changed?

### **Before (Async Event-Driven):**
```
Frontend → Master Update → Event Created → process-events (async) → Slave Update
```
- Changes were queued in `events` table
- `process-events` Edge Function processed events asynchronously
- No immediate feedback on Slave status
- Complex retry and backoff logic

### **After (Synchronous):**
```
Frontend → apply-schema-change-atomic → Validate → Slave Update → Master Update → Done
```
- Changes applied synchronously in single operation
- If Slave fails, Master is not updated (fail-fast)
- Immediate feedback on success/failure
- Simpler, more reliable

---

## Breaking Changes

### **1. Frontend Service Methods**

#### **Removed:**
- `getEventStatus()` - Use `getSchemaChangesHistory()` instead
- `subscribeToEventUpdates()` - Not needed (no async events)
- `unsubscribeFromEventUpdates()` - Not needed

#### **Changed:**
- `updateProjectSchema()` - Now deprecated, returns error (use `applySchemaChange()` directly)
- `createTable()` - Now uses `applySchemaChange()` internally
- `deleteTable()` - Now uses `applySchemaChange()` internally
- `updateRelationship()` - Now uses `applySchemaChange()` internally
- `deleteRelationship()` - Now uses `applySchemaChange()` internally

#### **New:**
- `getSchemaChangesHistory(projectId, limit)` - Get audit history from `schema_changes`

### **2. Edge Functions**

#### **Removed:**
- `process-events` - No longer deployed or used

#### **Changed:**
- `apply-schema-change-atomic` - Now applies synchronously (Slave FIRST, then Master)

---

## Migration Steps

### **Step 1: Update Frontend Calls**

**Before:**
```typescript
// Old: Direct project update (didn't sync to Slave)
await this.eventDrivenSchema.updateProjectSchema(projectId, newSchema, version);

// Old: Event subscription
this.eventDrivenSchema.subscribeToEventUpdates(projectId, (event) => {
  console.log('Event processed:', event);
});
```

**After:**
```typescript
// New: Use applySchemaChange for specific changes
await this.eventDrivenSchema.applySchemaChange(
  projectId,
  { type: 'add_table', table: tableData },
  newSchema,
  currentVersion
);

// New: Get history instead of events
const history = await this.eventDrivenSchema.getSchemaChangesHistory(projectId, 20);
```

### **Step 2: Update Error Handling**

**Before:**
```typescript
// Events were processed async, errors might come later
const result = await this.eventDrivenSchema.createTable(...);
// Could succeed even if Slave update failed later
```

**After:**
```typescript
// Errors are immediate - if Slave fails, entire operation fails
const result = await this.eventDrivenSchema.createTable(...);
if (!result.success) {
  // Slave or Master update failed - both are consistent
  console.error('Failed:', result.error);
}
```

### **Step 3: Remove Event Subscriptions**

**Before:**
```typescript
// Subscribe to events
this.eventDrivenSchema.subscribeToEventUpdates(projectId, callback);

// Later: unsubscribe
this.eventDrivenSchema.unsubscribeFromEventUpdates(projectId);
```

**After:**
```typescript
// No subscriptions needed - changes are synchronous
// If you need real-time updates, use Supabase Realtime on `projects` table
```

---

## Code Examples

### **Creating a Table:**

```typescript
// ✅ Correct: Use createTable() which calls applySchemaChange()
const result = await this.eventDrivenSchema.createTable(
  projectId,
  tableData,
  newSchemaData,
  currentVersion
);

if (!result.success) {
  // Handle error - Master and Slave are both unchanged
  console.error(result.error);
}
```

### **Updating a Column:**

```typescript
// ✅ Correct: Use applySchemaChange() directly
const result = await this.eventDrivenSchema.applySchemaChange(
  projectId,
  {
    type: 'alter_column_nullable',
    table_name: 't_users',
    column_name: 'email',
    nullable: false
  },
  newSchemaData,
  currentVersion
);
```

### **Getting History:**

```typescript
// ✅ New method for audit trail
const history = await this.eventDrivenSchema.getSchemaChangesHistory(
  projectId,
  20  // limit
);

history.forEach(change => {
  console.log(`${change.change_type} applied at ${change.applied_at}`);
});
```

---

## Database Changes

### **Tables Kept (for Historical Data):**
- `events` - Historical events (no new events created)
- `event_deliveries` - Historical delivery attempts
- `slave_configs` - Still used for future multi-slave support
- `event_types` - Reference data

### **Tables Used:**
- `schema_changes` - ✅ **Active** - All changes logged here
- `projects` - ✅ **Active** - Source of truth with version control
- `deployment_configs` - ✅ **Active** - Slave configuration

---

## Testing Migration

### **1. Verify Synchronous Flow:**

```typescript
// Create a table
const result = await eventDrivenSchema.createTable(...);

// Immediately check Slave (should have table)
// If result.success === true, Slave MUST have the table
```

### **2. Test Fail-Fast:**

```typescript
// Cause Slave error (e.g., invalid SQL)
// Result should be: success = false, Master unchanged
```

### **3. Test Concurrent Edits:**

```typescript
// Two users edit simultaneously
// Second user should get 409 Conflict
// First user succeeds, second must reload and retry
```

---

## Troubleshooting

### **Q: Changes not appearing in Slave?**
- Check Edge Function logs in Supabase Dashboard
- Verify `deployment_configs` has correct Slave credentials
- Check that `exec_sql` function exists in Slave

### **Q: Getting 409 Conflict errors?**
- This is normal for concurrent edits
- Frontend automatically retries with backoff
- If persists, user should reload project

### **Q: Slave updated but Master not?**
- This should never happen with new architecture
- If it does, check Edge Function logs
- May require manual reconciliation

---

## Rollback Plan

If you need to rollback (not recommended):

1. Restore previous `apply-schema-change-atomic` version
2. Re-enable `process-events` Edge Function
3. Revert frontend service changes
4. Process pending events from `events` table

**Note:** Data consistency may be affected if rollback occurs after using new system.

---

## Support

For issues or questions:
1. Check [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Check [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md)
3. Review Edge Function logs in Supabase Dashboard
4. Check `schema_changes` table for recent changes

---

## Summary

✅ **Benefits:**
- Simpler codebase
- More reliable (fail-fast guarantees consistency)
- Easier debugging (linear flow)
- Better performance (no async overhead)

⚠️ **Trade-offs:**
- Slave must be available for changes to succeed
- No async processing (all operations are blocking)
- Edge Function timeout limits (60s default)

