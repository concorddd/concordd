ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
CREATE POLICY "Authenticated read avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated read chat files" ON storage.objects;
CREATE POLICY "Authenticated read chat files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "Users upload chat files" ON storage.objects;
CREATE POLICY "Users upload chat files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own chat files" ON storage.objects;
CREATE POLICY "Users delete own chat files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);