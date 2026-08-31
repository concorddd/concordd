import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/streamcore/UserAvatar";
import { colorFor } from "@/lib/streamcore/storage";

export function ProfileDialog({
  open,
  onOpenChange,
  userId,
  displayName,
  avatarPath,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  displayName: string;
  avatarPath: string | null;
  onSaved: (next: { displayName: string; avatarPath: string | null }) => void;
}) {
  const [name, setName] = useState(displayName);
  const [path, setPath] = useState<string | null>(avatarPath);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5 MB.");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "png";
    const key = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(key, file, { upsert: true });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar a foto.");
      return;
    }
    setPath(key);
  };

  const save = async () => {
    setBusy(true);
    const clean = name.trim() || displayName;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: clean, avatar_path: path }, { onConflict: "id" });
    await supabase.auth.updateUser({ data: { display_name: clean } });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar o perfil.");
      return;
    }
    onSaved({ displayName: clean, avatarPath: path });
    onOpenChange(false);
    toast.success("Perfil atualizado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Personalizar perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar userId={userId} name={name} avatarPath={path} className="size-16 text-lg" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Sem foto, sua bolinha usa uma cor única:</p>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: colorFor(userId) }}
              >
                {colorFor(userId)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
            <Button variant="secondary" className="flex-1 gap-2" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Enviar foto
            </Button>
            {path && (
              <Button variant="ghost" size="icon" aria-label="Remover foto" onClick={() => setPath(null)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome de exibição</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <Button className="w-full" onClick={save} disabled={busy}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
