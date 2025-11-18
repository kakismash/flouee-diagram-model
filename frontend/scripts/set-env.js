#!/usr/bin/env node

/**
 * Script to set environment variables for Angular build
 * This script reads environment variables and creates the environment.prod.ts file
 */

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '../src/environments/environment.prod.ts');

// Get environment variables with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || 'https://cwbywxaafncyplgsrblw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Ynl3eGFhZm5jeXBsZ3NyYmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODYzNDYsImV4cCI6MjA3MTk2MjM0Nn0.OANkRlYa6rcCO-Ri3U5h8hfNnYX2-bX_BoalaNfmj9s';

const envContent = `export const environment = {
  production: true,
  
  // For backwards compatibility
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  
  // Master project (auth + metadata)
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  }
};
`;

fs.writeFileSync(envFile, envContent, 'utf8');
console.log('✅ Environment file generated successfully');
console.log(`   SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);

