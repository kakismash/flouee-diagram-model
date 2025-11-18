# Deployment Guide

This guide explains how to deploy the Flouee Diagram Model frontend to Netlify using GitHub Actions.

## Overview

The frontend is automatically deployed to Netlify when code is merged into the `master` branch. The deployment process includes:

1. TypeScript type checking
2. Building the Angular application
3. Verifying build output
4. Deploying to Netlify

## Prerequisites

- A Netlify account
- A GitHub repository with the code
- Access to GitHub repository settings (for secrets)

## Setup Instructions

### 1. Create a Netlify Site

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy manually" (we'll use GitHub Actions for deployment)
4. Note your **Site ID** (you'll need this for GitHub Secrets)

Alternatively, you can create the site via Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify sites:create --name your-site-name
```

### 2. Get Netlify Auth Token

1. Go to [Netlify User Settings](https://app.netlify.com/user/applications)
2. Click "New access token"
3. Give it a name (e.g., "GitHub Actions Deployment")
4. Copy the token (you'll only see it once!)

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

**Required Secrets (must create manually):**

| Secret Name | Description | Where to Get It | Required |
|------------|-------------|-----------------|----------|
| `NETLIFY_AUTH_TOKEN` | Netlify authentication token | Netlify User Settings → Applications | ✅ Yes |
| `SUPABASE_URL` | Master Supabase project URL | Supabase Dashboard → Settings → API | ✅ Yes |
| `SUPABASE_ANON_KEY` | Master Supabase anonymous key | Supabase Dashboard → Settings → API | ✅ Yes |

**Auto-created Secret:**

| Secret Name | Description | How It's Created |
|------------|-------------|------------------|
| `NETLIFY_SITE_ID` | Your Netlify site ID | Created automatically on first deploy if not set |

**Note:** See `GITHUB_SECRETS_SETUP.md` for detailed instructions on how to get and configure each secret.

### 4. Configure Netlify Environment Variables (Optional)

If you want to use Netlify's build environment variables directly (instead of GitHub Secrets), you can set them in Netlify:

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

**Note:** The GitHub Actions workflow uses GitHub Secrets, but if you deploy directly from Netlify (not via GitHub Actions), these environment variables will be used.

## Deployment Process

### Automatic Deployment

When you merge code into the `master` branch:

1. GitHub Actions workflow triggers automatically
2. Runs TypeScript type checking
3. Builds the Angular application with production environment variables
4. Verifies the build output
5. Deploys to Netlify production

### Manual Deployment

You can also trigger the workflow manually:

1. Go to GitHub repository → Actions tab
2. Select "Deploy to Netlify" workflow
3. Click "Run workflow"
4. Select the branch (usually `master`)
5. Click "Run workflow"

## Build Configuration

### Build Settings

The build is configured in `netlify.toml`:

- **Base directory:** `frontend`
- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist/frontend/browser`
- **Node version:** 20.x

### Environment Variables

Environment variables are injected at build time via the `frontend/scripts/set-env.js` script:

- `SUPABASE_URL` - Master Supabase project URL
- `SUPABASE_ANON_KEY` - Master Supabase anonymous key

These are read from GitHub Secrets during the build process.

## File Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy-netlify.yml    # GitHub Actions workflow
├── frontend/
│   ├── scripts/
│   │   └── set-env.js            # Environment variable injection script
│   ├── src/
│   │   └── environments/
│   │       └── environment.prod.ts  # Production environment (auto-generated)
│   └── package.json
└── netlify.toml                   # Netlify configuration
```

## Troubleshooting

### Build Fails with "Environment configuration is missing"

**Solution:** Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in GitHub Secrets.

### Build Fails with TypeScript Errors

**Solution:** Fix TypeScript errors locally first:
```bash
cd frontend
npx tsc --noEmit
```

### Deployment Fails with "NETLIFY_AUTH_TOKEN not found"

**Solution:** 
1. Verify the secret is set in GitHub repository settings
2. Ensure the secret name is exactly `NETLIFY_AUTH_TOKEN`
3. Check that the token is still valid in Netlify

### Build Output Not Found

**Solution:** 
1. Check that Angular build completed successfully
2. Verify the output directory is `dist/frontend/browser`
3. Check `angular.json` for the correct output path

### Site Not Updating After Deployment

**Solution:**
1. Check Netlify deployment logs in the dashboard
2. Verify the deployment completed successfully
3. Clear browser cache and try again
4. Check Netlify site settings for any build errors

## Local Testing

To test the build process locally:

```bash
cd frontend

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"

# Run the build
npm run build

# Verify output
ls -la dist/frontend/browser
```

## Monitoring

- **GitHub Actions:** Check the Actions tab in your GitHub repository
- **Netlify Dashboard:** View deployment logs and site status
- **Netlify Deploy Notifications:** Configure in Netlify site settings

## Security Notes

- Never commit secrets to the repository
- Use GitHub Secrets for sensitive values
- Rotate Netlify tokens periodically
- Review Netlify access logs regularly

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Angular Deployment Guide](https://angular.dev/guide/deployment)

