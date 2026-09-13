-- Verify Migration 0012 is applied in production (Supabase)

-- 1. Check table exists
SELECT
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'entity_facts'
AND schemaname = 'public';

-- 2. Check columns structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'entity_facts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'entity_facts'
AND trigger_schema = 'public';

-- 4. Check view exists
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'entity_facts_conflicts'
AND table_schema = 'public';

-- 5. Check indexes
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename = 'entity_facts'
AND schemaname = 'public'
ORDER BY indexname;

-- If all checks pass, migration is ready ✅
