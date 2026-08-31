import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Settings,
  LogOut,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MediaEngine } from "@/hooks/useMediaEngine";
import { UserAvatar } from "@/components/streamcore/UserAvatar";

export function UserBar({
  engine,
  name,
  userId,
  avatarPath,
  onOpenProfile,
  status,
  canShare,
  onOpenSettings,
  onSignOut,
  onLeave,
}: {
  engine: MediaEngine;
  name: string;
  userId: string;
  avatarPath: string | null;
  onOpenProfile: () => void;
  status: string;
  canShare: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onLeave: () => void;
}) {
  const active = engine.connected && engine.micOn && engine.speaking;

  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-background px-3 py-2 sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Personalizar perfil"
          className={cn("rounded-full", active && "animate-speaking")}
        >
          <UserAvatar userId={userId} name={name} avatarPath={avatarPath} className="size-9 text-xs" />
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpenProfile}>
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{status}</p>
        </div>

        {engine.connected && (
          <Button
            variant="destructive"
            onClick={onLeave}
            aria-label="Sair da ligação"
            className="ml-auto h-11 gap-2 px-4 sm:hidden"
          >
            <PhoneOff className="size-5" />
            Sair
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 sm:ml-auto">
        <BarButton
          label={engine.micOn ? "Mutar microfone" : "Ativar microfone"}
          onClick={engine.toggleMic}
          danger={!engine.micOn}
          big
        >
          {engine.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </BarButton>
        <BarButton
          label={engine.deafened ? "Reativar áudio" : "Desativar áudio"}
          onClick={engine.toggleDeafen}
          danger={engine.deafened}
          big
        >
          {engine.deafened ? <HeadphoneOff className="size-5" /> : <Headphones className="size-5" />}
        </BarButton>
        {canShare && (
          <BarButton
            label={engine.sharing ? "Parar transmissão" : "Transmitir tela"}
            onClick={() => (engine.sharing ? engine.stopShare() : engine.startShare())}
            accent={engine.sharing}
            big
          >
            {engine.sharing ? <MonitorX className="size-5" /> : <MonitorUp className="size-5" />}
          </BarButton>
        )}
        <BarButton label="Saída de áudio e microfone" onClick={onOpenSettings} big>
          <Volume2 className="size-5 sm:hidden" />
          <Settings className="hidden size-5 sm:block" />
        </BarButton>
        <BarButton label="Sair da conta" onClick={onSignOut} big>
          <LogOut className="size-5" />
        </BarButton>

        {engine.connected && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-2 hidden gap-1.5 sm:flex"
            onClick={onLeave}
          >
            <PhoneOff className="size-4" /> Desconectar
          </Button>
        )}
      </div>
    </footer>
  );
}

function BarButton({
  children,
  label,
  onClick,
  danger,
  accent,
  big,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
  big?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onClick={onClick}
          className={cn(
            "flex items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
            big ? "size-11 flex-1 sm:size-10 sm:flex-none" : "p-2",
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
