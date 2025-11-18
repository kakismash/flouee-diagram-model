# 🔍 Inspect Slave Schema API

**Edge Function:** `inspect-slave-schema`  
**Version:** 1.0  
**Status:** ✅ ACTIVE  
**Deployed:** 2025-10-19

---

## 📖 **Description**

Edge Function to inspect schemas, tables, and columns in the Slave database. Useful for debugging, verification, and auditing the actual state of physical tables.

---

## 🚀 **Deployment**

### **Deploy Command:**
```bash
npx supabase functions deploy inspect-slave-schema
```

### **Included in General Deploy:**
Add to `package.json`:
```json
{
  "scripts": {
    "deploy-functions": "npx supabase functions deploy",
    "deploy:inspect": "npx supabase functions deploy inspect-slave-schema"
  }
}
```

---

## 📡 **API Endpoints**

### **URL:**
```
POST https://[project-ref].supabase.co/functions/v1/inspect-slave-schema
```

### **Headers:**
```json
{
  "apikey": "your-anon-key",
  "Authorization": "Bearer your-jwt-token",
  "Content-Type": "application/json"
}
```

---

## 🎯 **Operation Modes**

### **1. Mode: `schemas`**
List all organization schemas

**Request:**
```json
{
  "mode": "schemas"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "schemas",
  "timestamp": "2025-10-19T20:00:00.000Z",
  "data": {
    "schemas": [
      {"schema_name": "org_4305d40642bd42d1883ba1289d67bb0f"},
      {"schema_name": "org_abc123..."}
    ]
  }
}
```

---

### **2. Mode: `tables`**
List all tables in a specific schema

**Request:**
```json
{
  "mode": "tables",
  "organization_id": "4305d406-42bd-42d1-883b-a1289d67bb0f"
}
```

Or using schema_name directly:
```json
{
  "mode": "tables",
  "schema_name": "org_4305d40642bd42d1883ba1289d67bb0f"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "tables",
  "timestamp": "2025-10-19T20:00:00.000Z",
  "data": {
    "tables": {
      "schema": "org_4305d40642bd42d1883ba1289d67bb0f",
      "tables": [
        {"table_name": "t_fdumojglx", "column_count": 8},
        {"table_name": "t_glkx6dp4o", "column_count": 6},
        {"table_name": "t_q4e4of3iu", "column_count": 6}
      ]
    }
  }
}
```

---

### **3. Mode: `table_details`**
Get complete details of a specific table

**Request:**
```json
{
  "mode": "table_details",
  "organization_id": "4305d406-42bd-42d1-883b-a1289d67bb0f",
  "table_name": "t_fdumojglx"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "table_details",
  "timestamp": "2025-10-19T20:00:00.000Z",
  "data": {
    "table_details": {
      "schema": "org_4305d40642bd42d1883ba1289d67bb0f",
      "table": "t_fdumojglx",
      "columns": [
        {
          "column_name": "id",
          "data_type": "uuid",
          "character_maximum_length": null,
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "ordinal_position": 1
        },
        {
          "column_name": "barcode",
          "data_type": "character varying",
          "character_maximum_length": 255,
          "is_nullable": "NO",
          "column_default": null,
          "ordinal_position": 8
        }
      ],
      "constraints": [...],
      "indexes": [...]
    }
  }
}
```

---

### **4. Mode: `all`**
Get all available information

**Request (without specific target):**
```json
{
  "mode": "all"
}
```

**Response:**
Includes: schemas, all_tables

**Request (with specific target):**
```json
{
  "mode": "all",
  "organization_id": "4305d406-42bd-42d1-883b-a1289d67bb0f",
  "table_name": "t_fdumojglx"
}
```

**Response:**
Includes: schemas, tables, table_details

---

## 🧪 **Usage Examples**

### **Example 1: JavaScript/TypeScript**

```typescript
const response = await fetch(
  'https://cwbywxaafncyplgsrblw.supabase.co/functions/v1/inspect-slave-schema',
  {
    method: 'POST',
    headers: {
      'apikey': 'your-anon-key',
      'Authorization': 'Bearer your-jwt',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'table_details',
      organization_id: '4305d406-42bd-42d1-883b-a1289d67bb0f',
      table_name: 't_fdumojglx'
    })
  }
);

const data = await response.json();
console.log(data.data.table_details.columns);
```

### **Example 2: cURL**

```bash
curl -X POST \
  'https://cwbywxaafncyplgsrblw.supabase.co/functions/v1/inspect-slave-schema' \
  -H 'apikey: your-anon-key' \
  -H 'Authorization: Bearer your-jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "mode": "tables",
    "organization_id": "4305d406-42bd-42d1-883b-a1289d67bb0f"
  }'
```

### **Example 3: Supabase Client**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cwbywxaafncyplgsrblw.supabase.co',
  'your-anon-key'
);

const { data, error } = await supabase.functions.invoke(
  'inspect-slave-schema',
  {
    body: {
      mode: 'table_details',
      organization_id: '4305d406-42bd-42d1-883b-a1289d67bb0f',
      table_name: 't_fdumojglx'
    }
  }
);

if (error) console.error(error);
else console.log(data.data.table_details.columns);
```

---

## 🛠️ **Use Cases**

### **1. Debugging Missing Columns**
```json
{
  "mode": "table_details",
  "organization_id": "...",
  "table_name": "t_fdumojglx"
}
```
Verify if a specific column (e.g., `barcode`) exists in the physical table.

### **2. Schema Auditing**
```json
{
  "mode": "all"
}
```
Get a complete snapshot of all schemas and tables.

### **3. Verify Synchronization**
Compare the result of `inspect-slave-schema` with the project's `schema_data` in Master to detect synchronization issues.

### **4. Deployment Monitoring**
After applying schema changes, verify that columns/tables were created correctly.

---

## 📊 **Frontend Integration**

### **Create Inspection Service:**

```typescript
// services/slave-inspector.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SlaveInspectorService {
  constructor(private supabase: SupabaseService) {}

  async inspectTable(orgId: string, tableName: string) {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: {
          mode: 'table_details',
          organization_id: orgId,
          table_name: tableName
        }
      }
    );

    if (error) throw error;
    return data.data.table_details;
  }

  async listTables(orgId: string) {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: {
          mode: 'tables',
          organization_id: orgId
        }
      }
    );

    if (error) throw error;
    return data.data.tables;
  }
}
```

---

## 🔐 **Security**

### **Permissions:**
- Requires valid JWT (verify_jwt: true)
- Uses Slave SERVICE_ROLE_KEY for queries
- Only accessible to authenticated users

### **Limitations:**
- Only reads information, does not modify anything
- Only schemas starting with `org_`
- Does not expose system schemas

---

## 📝 **Implementation Notes**

### **Dependencies:**
- Requires `exec_sql` function in Slave
- Uses `information_schema` for metadata
- Compatible with PostgreSQL 12+

### **Performance:**
- Mode `all` without target: ~500ms (depends on # of schemas)
- Mode `table_details`: ~100-200ms
- Mode `tables`: ~50-100ms
- Mode `schemas`: ~30-50ms

### **Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Slave configuration not found` | Missing env vars | Configure SLAVE_URL and SLAVE_SERVICE_ROLE_KEY |
| `relation does not exist` | Table does not exist | Verify table_name and schema_name |
| `exec_sql function not found` | Slave not set up | Run SLAVE_SETUP_COMPLETO.sql |

---

## 🚀 **Deployment Checklist**

- [ ] Function deployed: `npx supabase functions deploy inspect-slave-schema`
- [ ] Environment variables configured (SLAVE_URL, SLAVE_SERVICE_ROLE_KEY)
- [ ] `exec_sql` function exists in Slave
- [ ] Manual tests executed
- [ ] Documentation updated
- [ ] Added to general deploy scripts

---

## 📚 **References**

- **Edge Function:** `supabase/functions/inspect-slave-schema/index.ts`
- **Documentation:** `docs/INSPECT_SLAVE_SCHEMA_API.md`
- **Deployment:** Included in general Edge Functions deploy

---

**Deployed:** ✅ Version 1  
**Status:** ACTIVE  
**ID:** a4c99805-952e-444a-8a77-93b4f31bfdb6  
**Date:** 2025-10-19 20:00 UTC
