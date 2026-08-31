import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { colorFor, signedUrl } from "@/lib/streamcore/storage";

export function UserAvatar({
  userId,
  name,
  avatarPath,
  className,
}: {
  userId: string;
  name: string;
  avatarPath?: string | null;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (avatarPath) {
      void signedUrl("avatars", avatarPath).then((u) => {
        if (alive) setUrl(u);
      });
    }
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  const initials = (name || "??").slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white",
        className,
      )}
      style={url ? undefined : { backgroundColor: colorFor(userId || name) }}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initials
      )}
    </div>
  );
}
