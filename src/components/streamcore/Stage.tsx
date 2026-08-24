import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  MonitorPlay,
  PictureInPicture2,
  Mic,
  MicOff,
  Signal,
  Users,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOLUTION_ORDER, RESOLUTIONS, type ResolutionKey } from "@/lib/streamcore/media";
import type { MediaEngine } from "@/hooks/useMediaEngine";
import type { Channel } from "./ChannelList";
import type { Room } from "./ServerRail";

export function Stage({
  engine,
  room,
  channel,
  displayName,
  initials,
  onJoin,
}: {
  engine: MediaEngine;
  room: Room | null;
  channel: Channel | null;
  displayName: string;
  initials: string;
  onJoin: () => void;
}) {
  if (!engine.connected) {
    return <Lobby room={room} channel={channel} onJoin={onJoin} connecting={engine.connecting} />;
  }
  if (engine.sharing && engine.screenStream) {
    return <ScreenStage engine={engine} channel={channel} displayName={displayName} />;
  }
  return <Grid engine={engine} channel={channel} displayName={displayName} initials={initials} />;
}

function Lobby({
  room,
  channel,
  onJoin,
  connecting,
}: {
  room: Room | null;
  channel: Channel | null;
  onJoin: () => void;
  connecting: boolean;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden stage-glow p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
          <Volume2 className="size-7" />
        </div>
        <h1 className="font-display text-3xl font-semibold">{channel?.name ?? "Selecione um canal"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {room?.description || "Áudio de baixa latência e compartilhamento de tela até 4K/60fps."}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" onClick={onJoin} disabled={!channel || connecting} className="gap-2">
            <Signal className="size-4" />
            {connecting ? "Conectando…" : "Entrar no canal"}
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 text-left">
          {[
            { label: "Latência", value: "< 60 ms" },
            { label: "Vídeo", value: "até 4K60" },
            { label: "Codec", value: "Opus / VP9" },
          ].map((s) => (
            <div key={s.label} className="surface-panel rounded-xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="font-display text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Grid({
  engine,
  channel,
  displayName,
  initials,
}: {
  engine: MediaEngine;
  channel: Channel | null;
  displayName: string;
  initials: string;
}) {
  const tiles = [
    {
      id: "me",
      name: `${displayName} (você)`,
      initials,
      speaking: engine.micOn && engine.speaking,
      muted: !engine.micOn,
    },
    ...engine.participants.map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      speaking: p.speaking,
      muted: p.muted,
    })),
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <StageHeader channel={channel} count={tiles.length} />
      <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.id}
            className={cn(
              "relative flex min-h-40 flex-col items-center justify-center rounded-2xl border border-border bg-surface transition-all",
              t.speaking && "animate-speaking border-transparent",
            )}
          >
            <div className="flex size-16 items-center justify-center rounded-full gradient-primary text-lg font-bold text-primary-foreground">
              {t.initials}
            </div>
            <p className="mt-3 text-sm font-medium">{t.name}</p>
            <span className="absolute bottom-3 right-3 text-muted-foreground">
              {t.muted ? <MicOff className="size-4 text-destructive" /> : <Mic className="size-4" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageHeader({ channel, count }: { channel: Channel | null; count: number }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-6">
      <Volume2 className="size-4 text-primary" />
      <h2 className="font-display text-sm font-semibold">{channel?.name ?? "Canal"}</h2>
      <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
        <Users className="size-3" /> {count}
      </span>
    </header>
  );
}

function ScreenStage({
  engine,
  channel,
  displayName,
}: {
  engine: MediaEngine;
  channel: Channel | null;
  displayName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [viewQuality, setViewQuality] = useState<ResolutionKey>(engine.resolution);

  useEffect(() => {
    if (videoRef.current && engine.screenStream) {
      videoRef.current.srcObject = engine.screenStream;
      videoRef.current.play().catch(() => {});
    }
  }, [engine.screenStream]);

  const enterPip = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      /* navegador sem suporte */
    }
  };

  const fullscreen = () => {
    videoRef.current?.parentElement?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-6">
        <MonitorPlay className="size-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">{channel?.name ?? "Transmissão"}</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live">
          <span className="size-1.5 rounded-full bg-live animate-live" /> AO VIVO
        </span>
        {engine.shareStats && (
          <span className="text-xs text-muted-foreground">
            {engine.shareStats.width}×{engine.shareStats.height} · {engine.shareStats.fps} fps
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Select value={viewQuality} onValueChange={(v) => setViewQuality(v as ResolutionKey)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_ORDER.map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  Ver em {RESOLUTIONS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={enterPip} className="gap-1.5">
            <PictureInPicture2 className="size-4" /> PiP
          </Button>
          <Button variant="secondary" size="sm" onClick={fullscreen} className="gap-1.5">
            <Maximize2 className="size-4" /> Tela cheia
          </Button>
          <Button variant="destructive" size="sm" onClick={() => engine.stopShare()}>
            Parar
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-black/60">
          <video
            ref={videoRef}
            muted
            playsInline
            className="size-full object-contain"
            style={{ maxHeight: RESOLUTIONS[viewQuality].height }}
          />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none">
          {[{ id: "me", name: displayName, initials: displayName.slice(0, 2).toUpperCase(), speaking: engine.speaking && engine.micOn }, ...engine.participants].map(
            (p) => (
              <div
                key={p.id}
                className={cn(
                  "flex w-40 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2",
                  p.speaking && "animate-speaking border-transparent",
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-full gradient-primary text-[11px] font-bold text-primary-foreground">
                  {p.initials}
                </div>
                <span className="truncate text-xs">{p.name}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
