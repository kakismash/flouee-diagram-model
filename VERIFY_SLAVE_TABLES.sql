-- ============================================
-- 🎯 RUN IN: SLAVE PROJECT
-- ============================================
-- Project: ffzufnwxvqngglsapqrf
-- URL: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new
--
-- ⚠️ IMPORTANT: This SQL runs in the SLAVE project
-- ============================================

-- ============================================
-- VERIFY CREATED SCHEMAS AND TABLES
-- ============================================

-- 1. List all org_xxx schemas
SELECT 
    schema_name,
    (SELECT COUNT(*) 
     FROM information_schema.tables 
     WHERE table_schema = s.schema_name) as tables_count
FROM information_schema.schemata s
WHERE schema_name LIKE 'org_%'
ORDER BY schema_name;

-- 2. View tables in TechCorp schema
-- Schema: org_984cba2f7dce433bb7e536862e5c826b
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'org_984cba2f7dce433bb7e536862e5c826b'
ORDER BY table_name;

-- 3. View columns of users table (TechCorp)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'org_984cba2f7dce433bb7e536862e5c826b'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. View columns of products table (TechCorp)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'org_984cba2f7dce433bb7e536862e5c826b'
  AND table_name = 'products'
ORDER BY ordinal_position;

-- 5. View columns of orders table (TechCorp)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'org_984cba2f7dce433bb7e536862e5c826b'
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Query 1: Should display 5 schemas (1 per organization)
-- Query 2: Should display 3 tables (users, products, orders)
-- Query 3-5: Should display columns for each table, including "age" that we added in the test

-- ============================================
-- IF YOU SEE THE TABLES AND COLUMNS
-- ============================================
-- ✅ The system is working perfectly!
-- ✅ Master stores design (JSON)
-- ✅ Edge Function creates REAL tables in Slave
-- ✅ Each organization has its own isolated schema







