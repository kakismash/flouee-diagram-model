# Supabase Email Configuration

## Email Confirmation URL Configuration

The email confirmation links in Supabase are constructed using the "Site URL" configured in the Supabase Dashboard, not the `emailRedirectTo` parameter passed in the frontend code.

### Problem

Even though the frontend code uses `window.location.origin` to set the `emailRedirectTo` parameter, the base URL in the email confirmation link still points to `localhost:3000` or another hardcoded value.

### Root Cause

Supabase uses the "Site URL" configured in the Supabase Dashboard to construct the base URL for email confirmation links. The `emailRedirectTo` parameter only affects the redirect destination after clicking the link, not the base URL in the email itself.

### Solution

Update the Site URL configuration in the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your **Master** project (the one used for authentication)
3. Navigate to **Settings** → **Authentication** → **URL Configuration**
4. Set **Site URL** to your production URL:
   - Production: `https://your-site.netlify.app` (or your production domain)
   - Development: `http://localhost:4200` (for local development)
5. Add your production URL to **Redirect URLs**:
   - Add: `https://your-site.netlify.app/**`
   - Keep: `http://localhost:4200/**` (for local development)
6. Click **Save**

### Frontend Code

The frontend code in `frontend/src/app/services/auth.service.ts` is already correct:

```typescript
const redirectUrl = `${window.location.origin}${window.location.pathname}`;

const { data, error } = await this.supabase.client.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectUrl,
    // ...
  }
});
```

This ensures that after clicking the confirmation link, users are redirected to the correct URL based on where they signed up.

### Important Notes

- The **Site URL** in Supabase Dashboard is what appears in the email confirmation link
- The `emailRedirectTo` parameter only affects the redirect after clicking
- You need to update the Site URL in the Dashboard for each environment (production, staging, etc.)
- For local development, you can keep `http://localhost:4200` in the Site URL

### Verification

After updating the Site URL:

1. Sign up a new user
2. Check the email confirmation link
3. The link should start with your production URL (not localhost)
4. After clicking, the redirect should go to the URL specified in `emailRedirectTo`

