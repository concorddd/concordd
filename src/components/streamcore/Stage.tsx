import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  MonitorPlay,
  PictureInPicture2,
  Mic,
  MicOff,
  PhoneOff,
  Signal,
  Users,
  Volume2,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOLUTION_ORDER, RESOLUTIONS, type ResolutionKey } from "@/lib/streamcore/media";
import type { MediaEngine } from "@/hooks/useMediaEngine";
import { RemoteAudio } from "./RemoteAudio";
import type { Channel } from "./ChannelList";
import type { Room } from "./ServerRail";

export function Stage({
  engine,
  room,
  channel,
  displayName,
  initials,
  onJoin,
  onLeave,
}: {
  engine: MediaEngine;
  room: Room | null;
  channel: Channel | null;
  displayName: string;
  initials: string;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const remoteScreen = useMemo(() => {
    for (const p of engine.participants) {
      const video = p.stream?.getVideoTracks?.()[0];
      if (video && p.stream) return { stream: p.stream, name: p.name };
    }
    return null;
  }, [engine.participants]);

  const audio = (
    <>
      {engine.participants.map((p) => (
        <RemoteAudio key={p.id} stream={p.stream} deafened={engine.deafened} sinkId={engine.speakerId} />
      ))}
    </>
  );

  if (!engine.connected) {
    return (
      <>
        {audio}
        <Lobby room={room} channel={channel} onJoin={onJoin} connecting={engine.connecting} />
      </>
    );
  }

  const share =
    engine.sharing && engine.screenStream
      ? { stream: engine.screenStream, name: `${displayName} (você)`, local: true }
      : remoteScreen
        ? { ...remoteScreen, local: false }
        : null;

  return (
    <>
      {audio}
      {share ? (
        <ScreenStage engine={engine} channel={channel} share={share} displayName={displayName} onLeave={onLeave} />
      ) : (
        <Grid
          engine={engine}
          channel={channel}
          displayName={displayName}
          initials={initials}
          onLeave={onLeave}
        />
      )}
    </>
  );
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
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto stage-glow p-5 sm:p-8">
      <div className="w-full max-w-lg text-center stagger-children">
        <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl gradient-primary text-primary-foreground glow-ring">
          <Volume2 className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {channel?.name ?? "Selecione um canal"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {room?.description || "Áudio de baixa latência e compartilhamento de tela até 4K/60fps."}
        </p>

        <div className="mt-8">
          <Button
            size="lg"
            onClick={onJoin}
            disabled={!channel || connecting}
            className="h-14 w-full gap-2 text-base sm:h-12 sm:w-auto sm:px-8"
          >
            <Signal className="size-5" />
            {connecting ? "Conectando…" : "Entrar no canal"}
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { label: "Latência", value: "< 60 ms" },
            { label: "Vídeo", value: "até 4K60" },
            { label: "Codec", value: "Opus / VP9" },
          ].map((s) => (
            <div key={s.label} className="glass-panel hover-lift rounded-xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="font-display text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CallHeader({
  icon,
  title,
  children,
  onLeave,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  onLeave: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-6">
      <span className="text-primary">{icon}</span>
      <h2 className="truncate font-display text-sm font-semibold">{title}</h2>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {children}
        <Button
          variant="destructive"
          size="sm"
          onClick={onLeave}
          aria-label="Sair da ligação"
          className="h-9 gap-1.5 px-3"
        >
          <PhoneOff className="size-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}

function Grid({
  engine,
  channel,
  displayName,
  initials,
  onLeave,
}: {
  engine: MediaEngine;
  channel: Channel | null;
  displayName: string;
  initials: string;
  onLeave: () => void;
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CallHeader icon={<Volume2 className="size-4" />} title={channel?.name ?? "Canal"} onLeave={onLeave}>
        <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
          <Users className="size-3" /> {tiles.length}
        </span>
      </CallHeader>
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-4 overflow-y-auto p-4 stagger-children landscape:grid-cols-3 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.id}
            className={cn(
              "relative flex min-h-32 flex-col items-center justify-center rounded-2xl glass-panel hover-lift sm:min-h-40",
              t.speaking && "animate-speaking border-transparent",
            )}
          >
            <div className="flex size-14 items-center justify-center rounded-full gradient-primary text-lg font-bold text-primary-foreground sm:size-16">
              {t.initials}
            </div>
            <p className="mt-3 max-w-full truncate px-3 text-xs font-medium sm:text-sm">{t.name}</p>
            <span className="absolute bottom-3 right-3 text-muted-foreground">
              {t.muted ? <MicOff className="size-4 text-destructive" /> : <Mic className="size-4" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenStage({
  engine,
  channel,
  share,
  displayName,
  onLeave,
}: {
  engine: MediaEngine;
  channel: Channel | null;
  share: { stream: MediaStream; name: string; local: boolean };
  displayName: string;
  onLeave: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewQuality, setViewQuality] = useState<ResolutionKey>("1080p");
  const [zoom, setZoom] = useState(1);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = share.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [share.stream]);

  const enterPip = async () => {
    const el = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!el?.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      /* navegador sem suporte */
    }
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    pinchRef.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), zoom };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const next = Math.min(4, Math.max(1, (pinchRef.current.zoom * dist) / pinchRef.current.dist));
    setZoom(next);
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CallHeader
        icon={<MonitorPlay className="size-4" />}
        title={channel?.name ?? "Transmissão"}
        onLeave={onLeave}
      >
        <span className="hidden items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live sm:flex">
          <span className="size-1.5 rounded-full bg-live animate-live" /> AO VIVO
        </span>
        {share.local && engine.shareStats && (
          <span className="hidden text-xs text-muted-foreground lg:inline">
            {engine.shareStats.width}×{engine.shareStats.height} · {engine.shareStats.fps} fps
          </span>
        )}
        <div className="hidden items-center gap-2 md:flex">
          <Select value={viewQuality} onValueChange={(v) => setViewQuality(v as ResolutionKey)}>
            <SelectTrigger className="h-9 w-36 text-xs">
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
          {share.local && (
            <Button variant="secondary" size="sm" onClick={() => engine.stopShare()}>
              Parar
            </Button>
          )}
        </div>
        <Button variant="secondary" size="icon" onClick={fullscreen} aria-label="Tela cheia" className="size-9">
          <Maximize2 className="size-4" />
        </Button>
      </CallHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-6">
        <div
          ref={wrapRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-2xl border border-border bg-black/70"
        >
          <video
            ref={videoRef}
            muted={share.local || engine.deafened}
            playsInline
            autoPlay
            className="size-full object-contain transition-transform duration-100"
            style={{
              transform: `scale(${zoom})`,
              maxHeight: `min(100%, ${RESOLUTIONS[viewQuality].height}px)`,
            }}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[11px] backdrop-blur">
            <span className="size-1.5 rounded-full bg-live animate-live" />
            {share.name}
          </div>
          {zoom > 1 && (
            <button
              onClick={() => setZoom(1)}
              className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur"
            >
              <ZoomIn className="size-3.5" /> {zoom.toFixed(1)}× · tocar para redefinir
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none sm:gap-3">
          {[
            {
              id: "me",
              name: displayName,
              initials: displayName.slice(0, 2).toUpperCase(),
              speaking: engine.speaking && engine.micOn,
            },
            ...engine.participants,
          ].map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex w-36 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 sm:w-40",
                p.speaking && "animate-speaking border-transparent",
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full gradient-primary text-[11px] font-bold text-primary-foreground">
                {p.initials}
              </div>
              <span className="truncate text-xs">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
