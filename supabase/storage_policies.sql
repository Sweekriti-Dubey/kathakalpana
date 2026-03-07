-- Storage policies for private story images bucket
-- Adjust bucket name if you use a different value for STORY_IMAGES_BUCKET.

-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Allow authenticated users to manage files in their own folder: <uid>/...
create policy "story images read own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "story images insert own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "story images update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "story images delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
