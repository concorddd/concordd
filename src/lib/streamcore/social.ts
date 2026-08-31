import { supabase } from "@/integrations/supabase/client";

export type SocialUser = {
  id: string;
  name: string;
  avatarPath?: string | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  author_name: string;
  avatar_path: string | null;
  content: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

/** Busca o perfil público (nome + avatar) de um usuário. */
export async function fetchProfile(userId: string): Promise<SocialUser | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.display_name || "Usuário", avatarPath: data.avatar_path };
}

/** Todas as amizades (pendentes e aceitas) que envolvem o usuário atual. */
export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return (data ?? []) as Friendship[];
}

export function friendshipWith(list: Friendship[], me: string, other: string): Friendship | null {
  return (
    list.find(
      (f) =>
        (f.requester_id === me && f.addressee_id === other) ||
        (f.requester_id === other && f.addressee_id === me),
    ) ?? null
  );
}

export async function sendFriendRequest(me: string, other: string) {
  return supabase.from("friendships").insert({ requester_id: me, addressee_id: other });
}

export async function respondFriendRequest(id: string, accept: boolean) {
  if (accept) {
    return supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
  }
  return supabase.from("friendships").delete().eq("id", id);
}

export async function fetchConversation(me: string, other: string): Promise<DirectMessage[]> {
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
    )
    .order("created_at")
    .limit(200);
  return (data ?? []) as DirectMessage[];
}

export function belongsToConversation(m: DirectMessage, me: string, other: string) {
  return (
    (m.sender_id === me && m.recipient_id === other) ||
    (m.sender_id === other && m.recipient_id === me)
  );
}
