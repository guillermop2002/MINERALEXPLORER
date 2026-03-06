-- This SQL script creates the necessary tables for the Mineral Explorer Forum.
-- Please copy and paste this entire script into the "SQL Editor" in your Supabase Dashboard
-- and click "RUN" (or "Run Script") to set up the database.

-- 1. Create the threads table
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

-- 2. Create the likes tracking table to prevent multiple likes from the same user
CREATE TABLE IF NOT EXISTS public.thread_likes (
    thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, user_id)
);

-- 3. Enable Row Level Security (RLS) to keep data safe
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_likes ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies for Threads
-- Anyone can see threads
CREATE POLICY "Public threads are viewable by everyone."
ON public.threads FOR SELECT USING (true);

-- Only authenticated users can insert threads
CREATE POLICY "Users can create threads."
ON public.threads FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 5. Create Security Policies for Likes
-- Anyone can see likes
CREATE POLICY "Public likes are viewable by everyone."
ON public.thread_likes FOR SELECT USING (true);

-- Authenticated users can add likes
CREATE POLICY "Users can add likes."
ON public.thread_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authenticated users can remove their own likes
CREATE POLICY "Users can remove their likes."
ON public.thread_likes FOR DELETE USING (auth.uid() = user_id);

-- 6. Setup the Storage Bucket for images
-- Go to Storage -> Create new bucket -> Name it 'forum-images' -> Make it PUBLIC
-- The policies below let users upload to that bucket:
CREATE POLICY "Give users access to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'forum-images');
CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'forum-images');
