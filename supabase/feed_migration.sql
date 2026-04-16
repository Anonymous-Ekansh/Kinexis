-- ═══════════════════════════════════════
-- CAMPUS FEED — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Feed Posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  post_type TEXT NOT NULL DEFAULT 'thread',
  title TEXT NOT NULL,
  body TEXT,
  tags TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT false,
  image_url TEXT,
  professor_name TEXT,
  professor_subject TEXT,
  professor_rating NUMERIC(2,1),
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Feed Votes
CREATE TABLE IF NOT EXISTS public.feed_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  vote INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 3. Feed Comments
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Public view that strips user_id from anonymous posts
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
  professor_name,
  professor_subject,
  professor_rating,
  comment_count,
  created_at
FROM public.feed_posts;

-- 5. RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feed_posts" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "Auth users can insert feed_posts" ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own posts" ON public.feed_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read feed_votes" ON public.feed_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert feed_votes" ON public.feed_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.feed_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read feed_comments" ON public.feed_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert feed_comments" ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_feed_votes_post ON public.feed_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_votes_user ON public.feed_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments(post_id);
