-- Amizades
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending','accepted','blocked')),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique UNIQUE (requester_id, addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_read ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY friendships_insert ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY friendships_update ON public.friendships FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY friendships_delete ON public.friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Mensagens privadas (DM)
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  avatar_path text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX direct_messages_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at);
CREATE INDEX direct_messages_recipient_idx ON public.direct_messages (recipient_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_messages_read ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY direct_messages_insert ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY direct_messages_delete_own ON public.direct_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;