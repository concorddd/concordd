import { Plus, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Room = {
  id: string;
  name: string;
  icon: string;
  description: string;
  owner_id?: string | null;
};

export function ServerRail({
  rooms,
  activeRoomId,
  onSelect,
  onCreate,
}: {
  rooms: Room[];
  activeRoomId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <nav
      aria-label="Salas"
      className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background py-3 max-md:saturate-125 max-sm:saturate-150"
    >
      <div className="mb-1 flex size-11 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
        <Radio className="size-5" />
      </div>
      <div className="h-px w-8 bg-border" />
      <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto scrollbar-none py-1">
        {rooms.map((room) => {
          const active = room.id === activeRoomId;
          return (
            <Tooltip key={room.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(room.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex size-11 items-center justify-center rounded-2xl bg-surface text-sm font-semibold text-muted-foreground transition-all duration-200",
                    "hover:rounded-xl hover:bg-surface-3 hover:text-foreground",
                    active && "rounded-xl bg-primary/20 text-foreground glow-ring",
                  )}
                >
                  <span
                    className={cn(
                      "absolute -left-3 h-2 w-1 rounded-r-full bg-foreground transition-all",
                      active ? "h-6" : "h-0 group-hover:h-2",
                    )}
                  />
                  {room.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{room.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreate}
            className="flex size-11 items-center justify-center rounded-2xl bg-surface text-primary transition-all hover:rounded-xl hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Criar sala</TooltipContent>
      </Tooltip>
    </nav>
  );
}
