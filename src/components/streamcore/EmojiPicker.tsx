import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Sorrisos",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😋","😜","🤪","😝","🤗","🤔","🤨","😐","😑","😶","🙄","😏","😴","🤤","😪","😵","🤯","🥳","😎","🤓","🧐",
    ],
  },
  {
    label: "Reações",
    emojis: [
      "😢","😭","😤","😠","😡","🤬","😱","😨","😰","😥","🥺","😬","🤒","🤕","🤢","🤮","🤧","🥵","🥶","😈","💀","👻","🤡","💩",
    ],
  },
  {
    label: "Gestos",
    emojis: [
      "👍","👎","👌","🤌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","👋","🤚","🖐️","✋","🖖","👏","🙌","🤝","🙏","💪","🫶","✍️","💅",
    ],
  },
  {
    label: "Coração & Símbolos",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💯","🔥","✨","⭐","🎉","🎊","🎁","🏆","⚡","💡","💬","👀","🚀","🎮","🎧","🎤","🎵","📺","💻","📱","⌛","✅","❌","⚠️","🔔","🔒",
    ],
  },
  {
    label: "Comida & Bichos",
    emojis: [
      "🍕","🍔","🍟","🌭","🍿","🍩","🍪","🎂","🍫","🍺","🍻","🥤","☕","🍎","🍌","🍉","🐶","🐱","🐭","🦊","🐻","🐼","🐨","🦁","🐮","🐷","🐸","🐵","🐔","🦄",
    ],
  },
];

export function EmojiPicker({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Escolher emoji"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Smile className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[19rem] p-2">
        <div className="mb-2 flex gap-1 overflow-x-auto">
          {GROUPS.map((g, i) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setTab(i)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                i === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2",
              )}
            >
              {g.emojis[0]}
            </button>
          ))}
        </div>
        <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
          {GROUPS[tab]!.emojis.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPick(e)}
              className="rounded-md p-1 text-xl transition-transform hover:scale-125 hover:bg-surface-2"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
