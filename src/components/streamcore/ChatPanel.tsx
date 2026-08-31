import { Fragment, useEffect, useRef, useState } from "react";
import { Hash, Paperclip, SendHorizonal, Download, FileText, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/streamcore/UserAvatar";
import { EmojiPicker } from "@/components/streamcore/EmojiPicker";
import { formatBytes, signedUrl, MAX_UPLOAD_BYTES } from "@/lib/streamcore/storage";

export type ChatMessage = {
  id: string;
  channel_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  avatar_path?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

function Attachment({ message }: { message: ChatMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = (message.attachment_type ?? "").startsWith("image/");

  useEffect(() => {
    let alive = true;
    if (message.attachment_path) {
      void signedUrl("chat-files", message.attachment_path).then((u) => {
        if (alive) setUrl(u);
      });
    }
    return () => {
      alive = false;
    };
  }, [message.attachment_path]);

  if (!message.attachment_path) return null;

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block">
        <img
          src={url}
          alt={message.attachment_name ?? "imagem"}
          className="max-h-60 w-fit max-w-full rounded-xl border border-border object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      download={message.attachment_name ?? true}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface-2 p-2 transition-colors hover:bg-surface-3"
    >
      <FileText className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{message.attachment_name}</span>
        <span className="block text-[10px] text-muted-foreground">
          {formatBytes(message.attachment_size ?? 0)}
        </span>
      </span>
      {url ? (
        <Download className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      )}
    </a>
  );
}

export function ChatPanel({
  channelName,
  channelId,
  messages,
  onSend,
  onSendFile,
  disabled,
  className,
}: {
  channelName: string;
  channelId?: string | null;
  messages: ChatMessage[];
  onSend: (content: string) => void;
  onSendFile?: (file: File) => Promise<void>;
  disabled?: boolean;
  className?: string | undefined;
}) {
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newMarkerId, setNewMarkerId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Canal já inicializado nesta sessão (evita reexibir o separador ao trocar de aba).
  const initRef = useRef<string | null>(null);

  // Separador "Novas mensagens": aparece apenas ao reabrir o app/site quando há
  // mensagens mais recentes que a última visita (timestamp salvo em localStorage).
  useEffect(() => {
    if (!channelId || messages.length === 0) return;
    const key = `sc:lastread:${channelId}`;
    if (initRef.current !== channelId) {
      initRef.current = channelId;
      const stored = Number(localStorage.getItem(key) ?? 0);
      if (stored) {
        const firstNew = messages.find((m) => new Date(m.created_at).getTime() > stored);
        setNewMarkerId(firstNew ? firstNew.id : null);
      } else {
        setNewMarkerId(null);
      }
    }
    // Atualiza o marcador para a mensagem mais recente, de forma que a próxima
    // reabertura só mostre o separador se houver mensagens realmente novas.
    const latest = messages[messages.length - 1];
    if (latest) {
      localStorage.setItem(key, String(new Date(latest.created_at).getTime()));
    }
  }, [messages, channelId]);

  // Rola para o fim ao chegarem novas mensagens (tempo real).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Ao reabrir com separador, posiciona a rolagem nele em vez do fim.
  useEffect(() => {
    if (!newMarkerId) return;
    const t = setTimeout(() => markerRef.current?.scrollIntoView({ block: "start" }), 0);
    return () => clearTimeout(t);
  }, [newMarkerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (file && onSendFile) {
      setUploading(true);
      try {
        await onSendFile(file);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } finally {
        setUploading(false);
      }
    }
    const text = value.trim();
    if (text) {
      onSend(text);
      setValue("");
    }
  };

  return (
    <section className={cn("flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface max-md:saturate-125 max-sm:saturate-150", className)}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Hash className="size-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-semibold">{channelName}</h2>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda. Diga um olá.</p>
        )}
        {messages.map((m) => (
          <Fragment key={m.id}>
            {m.id === newMarkerId && (
              <div ref={markerRef} className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-primary/50" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Novas mensagens
                </span>
                <div className="h-px flex-1 bg-primary/50" />
              </div>
            )}
            <div className="flex gap-2.5">
              <UserAvatar
                userId={m.user_id}
                name={m.author_name}
                avatarPath={m.avatar_path ?? null}
                className="mt-0.5 size-7 text-[10px]"
              />
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
                {m.content && <p className="break-words text-sm text-foreground/90">{m.content}</p>}
                <Attachment message={m} />
              </div>
            </div>
          </Fragment>
        ))}
        <div ref={endRef} />
      </div>

      {file && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
          <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remover arquivo">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-1 border-t border-border p-2.5">
        <EmojiPicker disabled={disabled} onPick={(e) => setValue((v) => v + e)} />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > MAX_UPLOAD_BYTES) {
              alert("O arquivo excede o limite de 100 MB.");
              e.target.value = "";
              return;
            }
            setFile(f);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !onSendFile}
          aria-label="Anexar arquivo (até 100 MB)"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="size-5" />
        </Button>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Mensagem em #${channelName}`}
          disabled={disabled}
          className="bg-background"
        />
        <Button type="submit" size="icon" disabled={disabled || uploading} className="shrink-0">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
        </Button>
      </form>
    </section>
  );
}
