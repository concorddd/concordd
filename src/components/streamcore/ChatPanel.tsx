import { useEffect, useRef, useState } from "react";
import { Hash, SendHorizonal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ChatMessage = {
  id: string;
  channel_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export function ChatPanel({
  channelName,
  messages,
  onSend,
  disabled,
}: {
  channelName: string;
  messages: ChatMessage[];
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };

  return (
    <section className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Hash className="size-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-semibold">{channelName}</h2>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda. Diga um olá.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2.5">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
              {m.author_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {m.author_name}{" "}
                <span className="font-normal text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p className="break-words text-sm text-foreground/90">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Mensagem em #${channelName}`}
          disabled={disabled}
          className="bg-background"
        />
        <Button type="submit" size="icon" disabled={disabled}>
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </section>
  );
}
