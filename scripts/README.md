# 🔍 Verification Scripts

This folder contains SQL scripts to verify that the multi-tenant implementation has been completed correctly.

---

## 📄 Files

### `verify-master-setup.sql`

**Purpose**: Verify that the Master project (Control Plane) is correctly configured.

**How to use**:
1. Go to: https://app.supabase.com/project/cwbywxaafncyplgsrblw/editor
2. SQL Editor > New Query
3. Copy and paste the content of this file
4. Execute (Run)

**What it verifies**:
- ✅ 5 tables created (organizations, deployment_configs, etc.)
- ✅ 4 helper functions
- ✅ RLS enabled on all tables
- ✅ RLS policies created
- ✅ Triggers working
- ✅ Test organization created
- ✅ Deployment config registered

**Expected result**: All tests should show `✅ PASS`

---

### `verify-slave-setup.sql`

**Purpose**: Verify that the Slave project (Data Plane) is correctly configured.

**⚠️ IMPORTANT**: Execute in the SLAVE project, NOT in Master

**How to use**:
1. Go to the Slave project in Supabase Dashboard
2. SQL Editor > New Query
3. Copy and paste the content of this file
4. Execute (Run)

**What it verifies**:
- ✅ 6 tables created (projects, tables, columns, etc.)
- ✅ auth.organization_id() and auth.user_id() functions
- ✅ RLS enabled on all tables
- ✅ 20+ RLS policies created
- ✅ Auto-populate triggers
- ✅ organization_id columns in all tables
- ✅ Indexes created

**Expected result**: All tests should show `✅ PASS`

---

## 🚨 If Any Test Fails

1. **Copy the complete script output**
2. **Identify which test failed**
3. **Review the error message**
4. **Consult with the development team**

---

## 📊 Result Interpretation

### Test States:

- **✅ PASS**: The test passed correctly
- **❌ FAIL**: The test failed, review implementation
- **⚠️ WARNING**: Not critical, but requires attention

### Example of Successful Output:

```
test                          | status
------------------------------|----------
TEST 1: Tables Created        | ✅ PASS
TEST 2: Helper Functions      | ✅ PASS
TEST 3: RLS Enabled          | ✅ PASS
TEST 4: RLS Policies         | ✅ PASS
TEST 5: Triggers             | ✅ PASS
TEST 6: Test Organization    | ✅ PASS
TEST 7: Deployment Config    | ✅ PASS
```

---

## 🔄 When to Execute

### Master:
- ✅ After running migration `20250105_master_control_plane.sql`
- ✅ After creating the test organization
- ✅ After registering the Slave in deployment_configs

### Slave:
- ✅ After running migration `20250105_slave_data_plane.sql`
- ✅ After configuring the shared JWT Secret
- ✅ Before attempting to create test data

---

**See also**: `NEXT_STEPS.md` for the complete implementation guide
