CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Usuário',
  accent TEXT NOT NULL DEFAULT 'violet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'SC',
  description TEXT NOT NULL DEFAULT '',
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_read" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rooms_update_own" ON public.rooms FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rooms_delete_own" ON public.rooms FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'voice',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_read" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels_write_room_owner" ON public.channels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = channels.room_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = channels.room_id AND r.owner_id = auth.uid()));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Usuário',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_channel_idx ON public.messages (channel_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

INSERT INTO public.rooms (id, name, icon, description) VALUES
  ('11111111-1111-4111-8111-111111111111', 'StreamCore HQ', 'SC', 'Sala principal da comunidade StreamCore.'),
  ('22222222-2222-4222-8222-222222222222', 'Gaming Lab', 'GL', 'Sessões de jogo com compartilhamento em 4K.'),
  ('33333333-3333-4333-8333-333333333333', 'Design Room', 'DR', 'Revisões de design ao vivo.');

INSERT INTO public.channels (room_id, name, kind, position) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Palco Principal', 'voice', 0),
  ('11111111-1111-4111-8111-111111111111', 'Sala de Testes', 'voice', 1),
  ('11111111-1111-4111-8111-111111111111', 'geral', 'text', 2),
  ('11111111-1111-4111-8111-111111111111', 'suporte', 'text', 3),
  ('22222222-2222-4222-8222-222222222222', 'Squad 4K', 'voice', 0),
  ('22222222-2222-4222-8222-222222222222', 'estrategia', 'text', 1),
  ('33333333-3333-4333-8333-333333333333', 'Critique Live', 'voice', 0),
  ('33333333-3333-4333-8333-333333333333', 'referencias', 'text', 1);