# 🧪 Testing Suite - Flouee Diagram Model

## 📋 **Description**

Complete test suite for the schema management system with ID-based naming.

---

## 🏗️ **Test Structure**

```
tests/
└── schema-manager.test.ts    # Unit tests with Vitest

scripts/
├── deep-test-schema-system.js          # Complete E2E tests
├── test-e2e-schema-changes.js          # Legacy E2E tests
├── delete-project-with-cleanup.js      # Cleanup testing
└── apply-project-schema-to-slave.js    # Sync testing
```

---

## 🚀 **Run Tests**

### **Unit Tests (Vitest)**

```bash
# Run all tests
npm test

# Watch mode (re-runs on save)
npm run test:watch

# With coverage report
npm run test:coverage
```

### **E2E Tests**

```bash
# Complete deep testing (15 tests)
npm run test:deep

# Legacy E2E tests
npm run test:e2e
```

---

## 📊 **Test Coverage**

### **Unit Tests (25+ tests)**

#### **1. Table Creation (5 tests)**
- ✅ Generate internal name from ID
- ✅ Create table with unique internal name
- ✅ Multiple tables same display name
- ✅ Fallback to name if no internal_name
- ✅ Prefer internal_name when both exist

#### **2. Schema Change Detection (4 tests)**
- ✅ Detect added columns
- ✅ Detect removed columns
- ✅ Detect renamed columns
- ✅ Detect column type changes

#### **3. SQL Generation (3 tests)**
- ✅ CREATE TABLE with internal name
- ✅ ALTER TABLE with internal name
- ✅ DROP TABLE with internal name

#### **4. Foreign Keys (1 test)**
- ✅ Use internal names for both tables in FK

#### **5. Backward Compatibility (2 tests)**
- ✅ Work with tables without internal_name
- ✅ Prefer internal_name when both exist

#### **6. Multi-Project Scenarios (1 test)**
- ✅ Allow multiple projects with same table name

#### **7. Schema Data Structure (2 tests)**
- ✅ Correct structure for new tables
- ✅ Maintain display name for UI

### **E2E Tests (15 tests)**

#### **Project Operations:**
1. ✅ Create project in Master
2. ✅ Create second project (same org)

#### **Table Operations:**
3. ✅ Create table with ID-based naming
4. ✅ Create table with same name (different project)
5. ✅ Verify both tables coexist
6. ✅ Drop table

#### **Column Operations:**
7. ✅ Add column to table
8. ✅ Drop column from table
9. ✅ Rename column
10. ✅ Alter column type

#### **Relationship Operations:**
11. ✅ Create foreign key between tables

#### **Data Operations:**
12. ✅ Insert data into table

#### **Security:**
13. ✅ Verify RLS policies exist

#### **Audit:**
14. ✅ Check schema_changes audit trail
15. ✅ Verify SQL logged correctly

---

## 📝 **Writing New Tests**

### **Add Unit Test:**

```typescript
// tests/schema-manager.test.ts

it('should do something useful', () => {
  // Arrange
  const input = ...;
  
  // Act
  const result = someFunction(input);
  
  // Assert
  expect(result).toBe(expected);
});
```

### **Add E2E Test:**

```javascript
// scripts/deep-test-schema-system.js

async function testXX_MyNewTest() {
  console.log('\n📋 TEST XX: My New Test');
  console.log('─'.repeat(60));
  
  try {
    // Test logic here
    logTest('My test name', success, 'Details');
    return success;
  } catch (error) {
    logTest('My test name', false, error.message);
    return false;
  }
}

// Add to runAllTests()
await testXX_MyNewTest();
```

---

## 🎯 **Test Scenarios Covered**

### **Scenario 1: Basic Operations**
```
1. Create project
2. Create table
3. Add columns
4. Remove columns
5. Delete table
6. Delete project
✅ All operations work with ID-based naming
```

### **Scenario 2: Multi-Project**
```
Project A: Create table "users" (t_abc123)
Project B: Create table "users" (t_def456)
✅ Both coexist without conflict
```

### **Scenario 3: Relationships**
```
1. Create table "users" (t_user123)
2. Create table "orders" (t_order456)
3. Add FK: orders.user_id → users.id
✅ FK uses internal names correctly
```

### **Scenario 4: Backward Compatibility**
```
Old Project: Table without internal_name
New Changes: Still work using fallback
✅ No breaking changes
```

### **Scenario 5: Edit Detection**
```
1. Edit table (add column "email")
2. applyTableEdits() detects change
3. Generates: { type: 'add_column', table: 't_xxx', ... }
4. Applies to Slave
✅ Automatic change detection works
```

---

## 🔍 **Debugging Tests**

### **Test Failed?**

```bash
# Run with verbose output
npm run test:deep

# Check logs
cat .cursor/.agent-tools/*.txt

# Verify in Slave SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'org_xxx';
```

### **Check Test Data:**

```bash
# View test projects
node -e "
import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await client.from('projects').select('name, organization_id');
console.log(data);
"
```

---

## 📊 **Expected Results**

### **Unit Tests:**
```
✅ PASS: 25 tests
⏱️ Duration: < 1 second
📊 Coverage: > 80%
```

### **E2E Tests:**
```
✅ PASS: 15/15 tests
⏱️ Duration: 15-30 seconds
📊 Success Rate: 100%
```

---

## 🎓 **Best Practices**

1. **Always test with real Slave connection**
2. **Clean up test data after tests**
3. **Use unique IDs for test objects**
4. **Document expected behavior**
5. **Test edge cases and error scenarios**

---

## 📚 **References**

- **Architecture**: `docs/TABLE_ID_NAMING_ARCHITECTURE.md`
- **Implementation**: `ACTUALIZACION_COMPLETA_BATCH.md`
- **Plan**: `PLAN_RESET_Y_TESTING_COMPLETO.md`

---

**Last Update:** 2025-10-19  
**Version:** 2.0.0
