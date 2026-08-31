import { Hash, Plus, Volume2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Room } from "./ServerRail";

export type Channel = {
  id: string;
  room_id: string;
  name: string;
  kind: string;
  position: number;
};

export function ChannelList({
  room,
  channels,
  activeVoiceId,
  activeTextId,
  connectedChannelId,
  onSelectVoice,
  onSelectText,
  onCreateChannel,
  canManage,
}: {
  room: Room | null;
  channels: Channel[];
  activeVoiceId: string | null;
  activeTextId: string | null;
  connectedChannelId: string | null;
  onSelectVoice: (id: string) => void;
  onSelectText: (id: string) => void;
  onCreateChannel: () => void;
  canManage: boolean;
}) {
  const voice = channels.filter((c) => c.kind === "voice");
  const text = channels.filter((c) => c.kind === "text");

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface max-md:saturate-125 max-sm:saturate-150">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <h2 className="truncate font-display text-sm font-semibold">{room?.name ?? "StreamCore"}</h2>
        {canManage && (
          <button
            onClick={onCreateChannel}
            aria-label="Criar canal"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        <Section title="Canais de voz / vídeo">
          {voice.map((c) => (
            <ChannelButton
              key={c.id}
              icon={<Volume2 className="size-4" />}
              label={c.name}
              active={c.id === activeVoiceId}
              live={c.id === connectedChannelId}
              onClick={() => onSelectVoice(c.id)}
            />
          ))}
          {voice.length === 0 && <Empty label="Nenhum canal de voz" />}
        </Section>

        <Section title="Canais de texto">
          {text.map((c) => (
            <ChannelButton
              key={c.id}
              icon={<Hash className="size-4" />}
              label={c.name}
              active={c.id === activeTextId}
              onClick={() => onSelectText(c.id)}
            />
          ))}
          {text.length === 0 && <Empty label="Nenhum canal de texto" />}
        </Section>
      </div>

      <div className="border-t border-border p-3">
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={onCreateChannel}>
          <Users className="size-4" />
          Nova sala de voz
        </Button>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="px-2 py-1 text-xs text-muted-foreground/70">{label}</p>;
}

function ChannelButton({
  icon,
  label,
  active,
  live,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  live?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors",
        "hover:bg-surface-2 hover:text-foreground",
        active && "bg-surface-3 text-foreground",
      )}
    >
      <span className={cn("text-muted-foreground group-hover:text-foreground", active && "text-primary")}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {live && <span className="ml-auto size-2 rounded-full bg-speaking animate-live" />}
    </button>
  );
}
