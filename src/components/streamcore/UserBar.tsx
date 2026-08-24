import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MediaEngine } from "@/hooks/useMediaEngine";

export function UserBar({
  engine,
  name,
  initials,
  onOpenSettings,
  onSignOut,
}: {
  engine: MediaEngine;
  name: string;
  initials: string;
  onOpenSettings: () => void;
  onSignOut: () => void;
}) {
  const active = engine.connected && engine.micOn && engine.speaking;

  return (
    <footer className="flex h-16 items-center gap-2 border-t border-border bg-background px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground",
            active && "animate-speaking",
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {engine.connected ? (engine.sharing ? "Transmitindo" : "Em chamada") : "Disponível"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <BarButton
          label={engine.micOn ? "Mutar microfone" : "Ativar microfone"}
          onClick={engine.toggleMic}
          danger={!engine.micOn}
        >
          {engine.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </BarButton>
        <BarButton
          label={engine.deafened ? "Reativar áudio" : "Desativar áudio"}
          onClick={engine.toggleDeafen}
          danger={engine.deafened}
        >
          {engine.deafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
        </BarButton>
        <BarButton
          label={engine.sharing ? "Parar transmissão" : "Transmitir tela"}
          onClick={() => (engine.sharing ? engine.stopShare() : engine.startShare())}
          accent={engine.sharing}
        >
          {engine.sharing ? <MonitorX className="size-4" /> : <MonitorUp className="size-4" />}
        </BarButton>
        <BarButton label="Configurações de mídia" onClick={onOpenSettings}>
          <Settings className="size-4" />
        </BarButton>
        <BarButton label="Sair da conta" onClick={onSignOut}>
          <LogOut className="size-4" />
        </BarButton>
      </div>

      {engine.connected && (
        <Button variant="destructive" size="sm" className="ml-2" onClick={() => engine.leave()}>
          Desconectar
        </Button>
      )}
    </footer>
  );
}

function BarButton({
  children,
  label,
  onClick,
  danger,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onClick={onClick}
          className={cn(
            "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
            danger && "text-destructive hover:text-destructive",
            accent && "bg-primary/20 text-primary",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
