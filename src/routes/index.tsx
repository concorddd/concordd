import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Menu, MessageSquare, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { ServerRail, type Room } from "@/components/streamcore/ServerRail";
import { ChannelList, type Channel } from "@/components/streamcore/ChannelList";
import { Stage } from "@/components/streamcore/Stage";
import { UserBar } from "@/components/streamcore/UserBar";
import { ChatPanel, type ChatMessage } from "@/components/streamcore/ChatPanel";
import { MediaSettingsDialog } from "@/components/streamcore/MediaSettingsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamCore — voz de baixa latência e tela em 4K" },
      {
        name: "description",
        content:
          "StreamCore é o hub de chamadas de voz de baixa latência com compartilhamento de tela em até 4K/60fps, chat integrado e salas persistentes.",
      },
      { property: "og:title", content: "StreamCore — voz e tela em 4K" },
      {
        property: "og:description",
        content: "Chamadas de áudio de baixa latência e compartilhamento de tela em alta definição.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StreamCore,
});

function StreamCore() {
  const navigate = useNavigate();
  const engine = useMediaEngine();

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [textId, setTextId] = useState<string | null>(null);
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "call">("chat");
  const [createOpen, setCreateOpen] = useState<"room" | "channel" | null>(null);
  const [draftName, setDraftName] = useState("");
  const leaveRef = useRef(engine.leave);
  leaveRef.current = engine.leave;

  const displayName =
    (session?.user.user_metadata?.["display_name"] as string | undefined) ??
    session?.user.email?.split("@")[0] ??
    "Você";
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (!data.session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const { data } = await supabase.from("rooms").select("*").order("created_at");
      const list = (data ?? []) as Room[];
      setRooms(list);
      setRoomId((prev) => prev ?? list[0]?.id ?? null);
      await supabase
        .from("profiles")
        .upsert({ id: session.user.id, display_name: displayName }, { onConflict: "id" });
    })();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!roomId) return;
    void (async () => {
      const { data } = await supabase.from("channels").select("*").eq("room_id", roomId).order("position");
      const list = (data ?? []) as Channel[];
      setChannels(list);
      setVoiceId(list.find((c) => c.kind === "voice")?.id ?? null);
      setTextId(list.find((c) => c.kind === "text")?.id ?? null);
    })();
  }, [roomId]);

  useEffect(() => {
    if (!textId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", textId)
        .order("created_at")
        .limit(100);
      setMessages((data ?? []) as ChatMessage[]);
    })();

    const channel = supabase
      .channel(`messages-${textId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${textId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [textId]);

  useEffect(() => {
    if (engine.error) {
      toast.error(engine.error);
      engine.setError(null);
    }
  }, [engine.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = useMemo(() => rooms.find((r) => r.id === roomId) ?? null, [rooms, roomId]);
  const voiceChannel = useMemo(() => channels.find((c) => c.id === voiceId) ?? null, [channels, voiceId]);
  const textChannel = useMemo(() => channels.find((c) => c.id === textId) ?? null, [channels, textId]);

  const join = useCallback(async () => {
    if (!room || !voiceChannel || !session) return;
    setNavOpen(false);
    setMobileView("call");
    await engine.join(room.id, voiceChannel.id, session.user.id, displayName);
    setConnectedChannelId(voiceChannel.id);
  }, [engine, room, voiceChannel, displayName, session]);

  const leave = useCallback(async () => {
    await engine.leave();
    setConnectedChannelId(null);
    toast("Você saiu da chamada");
  }, [engine]);

  useEffect(() => {
    if (!engine.connected) setConnectedChannelId(null);
  }, [engine.connected]);

  // Encerra tudo de forma limpa ao fechar a aba.
  useEffect(() => {
    const handler = () => void leaveRef.current();
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, []);

  const sendMessage = async (content: string) => {
    if (!session || !textId) return;
    const { error } = await supabase
      .from("messages")
      .insert({ channel_id: textId, user_id: session.user.id, author_name: displayName, content });
    if (error) toast.error("Não foi possível enviar a mensagem.");
  };

  const createRoom = async () => {
    if (!session || !draftName.trim()) return;
    const name = draftName.trim();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name,
        icon: name.slice(0, 2).toUpperCase(),
        description: `Sala criada por ${displayName}.`,
        owner_id: session.user.id,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error("Não foi possível criar a sala.");
      return;
    }
    await supabase.from("channels").insert([
      { room_id: data.id, name: "Palco Principal", kind: "voice", position: 0 },
      { room_id: data.id, name: "geral", kind: "text", position: 1 },
    ]);
    setRooms((prev) => [...prev, data as Room]);
    setRoomId(data.id);
    setCreateOpen(null);
    setDraftName("");
    toast.success("Sala criada!");
  };

  const createChannel = async () => {
    if (!roomId || !draftName.trim()) return;
    const { data, error } = await supabase
      .from("channels")
      .insert({ room_id: roomId, name: draftName.trim(), kind: "voice", position: channels.length })
      .select()
      .single();
    if (error || !data) {
      toast.error("Só o dono da sala pode criar canais aqui.");
      return;
    }
    setChannels((prev) => [...prev, data as Channel]);
    setVoiceId(data.id);
    setCreateOpen(null);
    setDraftName("");
  };

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const status = engine.connected
    ? engine.sharing
      ? "Transmitindo"
      : "Em chamada"
    : "Online";

  const navigation = (
    <div className="flex h-full min-h-0">
      <ServerRail
        rooms={rooms}
        activeRoomId={roomId}
        onSelect={(id) => {
          setRoomId(id);
        }}
        onCreate={() => {
          setDraftName("");
          setCreateOpen("room");
        }}
      />
      <ChannelList
        room={room}
        channels={channels}
        activeVoiceId={voiceId}
        activeTextId={textId}
        connectedChannelId={connectedChannelId}
        onSelectVoice={(id) => {
          setVoiceId(id);
          setNavOpen(false);
        }}
        onSelectText={(id) => {
          setTextId(id);
          setNavOpen(false);
        }}
        canManage={room?.owner_id === session.user.id}
        onCreateChannel={() => {
          setDraftName("");
          setCreateOpen("channel");
        }}
      />
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
        {/* Desktop: 3 colunas */}
        <div className="hidden md:flex">{navigation}</div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile: barra superior com gaveta e alternância Chat / Chamada */}
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2 md:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu de salas e canais">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[19rem] p-0">
                <SheetTitle className="sr-only">Salas e canais</SheetTitle>
                {navigation}
              </SheetContent>
            </Sheet>
            <div className="ml-auto flex items-center gap-1 rounded-xl bg-surface-2 p-1">
              <button
                onClick={() => setMobileView("chat")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  mobileView === "chat"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                <MessageSquare className="size-4" /> Chat
              </button>
              <button
                onClick={() => setMobileView("call")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  mobileView === "call"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Radio className="size-4" /> Chamada
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <div
              className={cn(
                "min-w-0 flex-1 flex-col md:flex",
                mobileView === "call" ? "flex" : "hidden",
              )}
            >
              <Stage
                engine={engine}
                room={room}
                channel={voiceChannel}
                displayName={displayName}
                initials={initials}
                onJoin={join}
                onLeave={leave}
              />
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 md:hidden",
                mobileView === "chat" ? "flex" : "hidden",
              )}
            >
              <ChatPanel
                channelName={textChannel?.name ?? "geral"}
                messages={messages}
                onSend={sendMessage}
                disabled={!textId}
                className="w-full border-l-0"
              />
            </div>
            <div className="hidden lg:block">
              <ChatPanel
                channelName={textChannel?.name ?? "geral"}
                messages={messages}
                onSend={sendMessage}
                disabled={!textId}
              />
            </div>
          </div>


          <UserBar
            engine={engine}
            name={displayName}
            initials={initials}
            status={status}
            canShare
            onOpenSettings={() => setSettingsOpen(true)}
            onSignOut={async () => {
              await engine.leave();
              await supabase.auth.signOut();
            }}
            onLeave={leave}
          />
        </div>
      </div>

      <MediaSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} engine={engine} />

      <Dialog open={createOpen !== null} onOpenChange={(v) => setCreateOpen(v ? createOpen : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {createOpen === "room" ? "Criar nova sala" : "Criar canal de voz"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="draft">Nome</Label>
            <Input
              id="draft"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={createOpen === "room" ? "Minha sala" : "Palco secundário"}
            />
            <Button className="w-full" onClick={createOpen === "room" ? createRoom : createChannel}>
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
