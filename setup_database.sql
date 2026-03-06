-- ============================================================
-- MINERAL EXPLORER — Database Setup
-- Copy and paste this entire script into Supabase SQL Editor
-- and click "RUN" to set up all tables.
-- ============================================================

-- 1. FORUM: Threads table
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    coords TEXT,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    author_name TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FORUM: Likes tracking
CREATE TABLE IF NOT EXISTS public.thread_likes (
    thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, user_id)
);

-- 3. QUEDADAS: Meetups table
CREATE TABLE IF NOT EXISTS public.meetups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location_lat DECIMAL(10,7),
    location_lng DECIMAL(10,7),
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    author_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. QUEDADAS: Attendance tracking
CREATE TABLE IF NOT EXISTS public.meetup_attendees (
    meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    PRIMARY KEY (meetup_id, user_id)
);

-- 5. QUEDADAS: Comments on meetups
CREATE TABLE IF NOT EXISTS public.meetup_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    user_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_comments ENABLE ROW LEVEL SECURITY;

-- FORUM policies
CREATE POLICY "Public threads are viewable by everyone."
ON public.threads FOR SELECT USING (true);

CREATE POLICY "Users can create threads."
ON public.threads FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Public likes are viewable by everyone."
ON public.thread_likes FOR SELECT USING (true);

CREATE POLICY "Users can add likes."
ON public.thread_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes."
ON public.thread_likes FOR DELETE USING (auth.uid() = user_id);

-- MEETUP policies
CREATE POLICY "Public meetups are viewable by everyone."
ON public.meetups FOR SELECT USING (true);

CREATE POLICY "Users can create meetups."
ON public.meetups FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Public attendees are viewable by everyone."
ON public.meetup_attendees FOR SELECT USING (true);

CREATE POLICY "Users can join meetups."
ON public.meetup_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave meetups."
ON public.meetup_attendees FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public meetup comments are viewable by everyone."
ON public.meetup_comments FOR SELECT USING (true);

CREATE POLICY "Users can add meetup comments."
ON public.meetup_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STORAGE policies (for forum images bucket 'forum-images')
-- CREATE POLICY "Give users access to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'forum-images');
-- CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'forum-images');
