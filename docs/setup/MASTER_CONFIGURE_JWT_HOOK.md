# 🔐 Configure JWT Custom Claims Hook

## ⚠️ MANUAL ACTION REQUIRED

This configuration must be done from the Supabase Dashboard because it requires special permissions from the `auth` schema.

---

## 📋 Configuration Steps

### 1. Go to Auth Hooks Dashboard

**URL:** https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/auth/hooks

---

### 2. Enable "Custom Access Token Hook"

- Click on **"Custom Access Token Hook"**
- Toggle: **Enable Hook**

---

### 3. Configure the Function

In the SQL editor that appears, paste this:

```sql
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  user_role text;
BEGIN
  -- Get user's organization_id and role
  SELECT organization_id, role INTO user_org_id, user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;
  
  -- Add organization_id to JWT
  IF user_org_id IS NOT NULL THEN
    event := jsonb_set(
      event,
      '{claims,organization_id}',
      to_jsonb(user_org_id::text)
    );
  END IF;
  
  -- Add user_role to JWT
  IF user_role IS NOT NULL THEN
    event := jsonb_set(
      event,
      '{claims,user_role}',
      to_jsonb(user_role)
    );
  END IF;
  
  RETURN event;
END;
$$;
```

---

### 4. Save and Enable

- Click **"Save"**
- Toggle **"Enable"**
- Status should be: 🟢 **Enabled**

---

### 5. Verify

After configuring, the JWT will include:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "organization_id": "984cba2f-7dce-433b-b7e5-36862e5c826b",  ← New
  "user_role": "org_admin"  ← New
}
```

---

## 🧪 Testing

To verify it works:

1. Logout and Login again
2. In the browser console, run:
```javascript
const session = await supabase.auth.getSession();
console.log('JWT Claims:', session.data.session.access_token);

// Decode the JWT at: https://jwt.io/
// You should see organization_id and user_role in the claims
```

---

## ✅ After Configuring

Tell me **"configured"** and I will continue with:
- Helper functions in Slave
- Automatic RLS policies
- Isolation tests

---

**Estimated time:** 2-3 minutes of manual configuration
