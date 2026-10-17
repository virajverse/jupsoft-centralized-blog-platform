-- ============================================================
-- PostgreSQL Full-Text Search (FTS) Migration
-- TRD §4: "PostgreSQL full-text search (Phase 1)"
--
-- Adds a GENERATED ALWAYS tsvector column to blog_translations
-- and a GIN index for sub-millisecond full-text queries.
--
-- The generated column combines: title + excerpt + content
-- weighted appropriately (title = A, excerpt = B, content = C).
--
-- Run this once against your PostgreSQL database:
--   psql $DATABASE_URL -f prisma/migrations/add_fts_search_vector.sql
--
-- Or via Node script:
--   pnpm run fts:migrate
-- ============================================================

-- Step 1: Add tsvector generated column
-- Uses setweight() to rank title matches higher than content matches
ALTER TABLE blog_translations
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title,    '')), 'A') ||
  setweight(to_tsvector('english', coalesce(excerpt,  '')), 'B') ||
  setweight(to_tsvector('english', coalesce(
    -- Strip HTML tags from Tiptap JSON/HTML content before indexing
    regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g'),
    ''
  )), 'C')
) STORED;

-- Step 2: Create GIN index for fast full-text queries
CREATE INDEX IF NOT EXISTS idx_blog_translations_fts_gin
ON blog_translations USING GIN (search_vector);

-- Step 3: Additional btree index on (blog_id, lang) for join performance
CREATE INDEX IF NOT EXISTS idx_blog_translations_blog_lang
ON blog_translations (blog_id, lang);

-- Verify
SELECT
  column_name,
  data_type,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'blog_translations'
  AND column_name = 'search_vector';
