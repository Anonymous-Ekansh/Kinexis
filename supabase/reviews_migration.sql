-- ═══════════════════════════════════════
-- REVIEWS FEATURE — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Cafes table (seeded with 11 cafes)
CREATE TABLE IF NOT EXISTS public.cafes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  image_url TEXT,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cafe Posts (reviews/forum posts for a cafe)
CREATE TABLE IF NOT EXISTS public.cafe_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Course Reviews
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  course_title TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Campus Reviews
CREATE TABLE IF NOT EXISTS public.campus_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cafes" ON public.cafes FOR SELECT USING (true);
CREATE POLICY "Anyone can read cafe_posts" ON public.cafe_posts FOR SELECT USING (true);
CREATE POLICY "Auth users can insert cafe_posts" ON public.cafe_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read course_reviews" ON public.course_reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can insert course_reviews" ON public.course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read campus_reviews" ON public.campus_reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can insert campus_reviews" ON public.campus_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cafe_posts_cafe ON public.cafe_posts(cafe_id);
CREATE INDEX IF NOT EXISTS idx_cafe_posts_created ON public.cafe_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_reviews_created ON public.course_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campus_reviews_created ON public.campus_reviews(created_at DESC);

-- 7. Seed Cafes
INSERT INTO public.cafes (name, description, location) VALUES
  ('Chai Point', 'The go-to spot for cutting chai and campus gossip.', 'Near Main Gate'),
  ('Nescafe Corner', 'Quick coffee fix between classes. Always crowded at 10 AM.', 'Academic Block A'),
  ('The Maggi Hub', 'Legendary 2-minute Maggi that actually takes 15 minutes.', 'Hostel Block C'),
  ('Campus Dhaba', 'Parathas, omelettes, and late-night cravings sorted.', 'Behind Library'),
  ('Just Bake', 'Fresh pastries, sandwiches, and decent cold coffee.', 'Student Center'),
  ('South Express', 'Best dosas and filter coffee on campus.', 'Food Court'),
  ('Wrapster', 'Wraps, rolls, and shakes — the lunch hour favourite.', 'Near Sports Complex'),
  ('The Juice Bar', 'Fresh juices and smoothie bowls for the health-conscious.', 'Gym Building'),
  ('Pizza Square', 'Affordable pizzas that hit different after midnight.', 'Hostel Block A'),
  ('Biryani House', 'Thursday biryani is a campus tradition at this point.', 'Food Court Level 2'),
  ('Frozen Scoop', 'Ice cream and waffles — the dessert therapy you need.', 'Near Amphitheatre')
ON CONFLICT DO NOTHING;
