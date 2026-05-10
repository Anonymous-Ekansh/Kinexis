-- ═══════════════════════════════════════
-- REMOVE GRADE PROFESSORS FEATURE
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Recreate the view WITHOUT professor columns
CREATE OR REPLACE VIEW public.public_feed_posts AS
SELECT
  id,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  post_type,
  title,
  body,
  tags,
  is_anonymous,
  image_url,
  comment_count,
  created_at
FROM public.feed_posts;

-- 2. Drop professor columns from feed_posts table
ALTER TABLE public.feed_posts DROP COLUMN IF EXISTS professor_name;
ALTER TABLE public.feed_posts DROP COLUMN IF EXISTS professor_subject;
ALTER TABLE public.feed_posts DROP COLUMN IF EXISTS professor_rating;

-- 3. (Optional) Delete any existing professor_rating posts
-- Uncomment the line below if you want to remove existing professor rating posts:
-- DELETE FROM public.feed_posts WHERE post_type = 'professor_rating';
