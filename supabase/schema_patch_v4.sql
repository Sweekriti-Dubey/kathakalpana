-- Add new table for tracking reading history
CREATE TABLE IF NOT EXISTS public.reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles_v2(profile_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on reading_history" 
ON public.reading_history 
FOR ALL 
USING (true);

-- Add daily_goal to kid_settings if not exists
ALTER TABLE public.kid_settings 
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 2;

-- Notify Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
