import { useEffect, useRef } from "react";

/** Reproduz o áudio de um participante remoto, respeitando o dispositivo de saída escolhido. */
export function RemoteAudio({
  stream,
  deafened,
  sinkId,
}: {
  stream?: MediaStream | undefined;
  deafened: boolean;
  sinkId?: string | undefined;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.volume = 1;
    const tryPlay = () => void el.play().catch(() => {});
    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [stream]);

  useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId || !sinkId) return;
    el.setSinkId(sinkId).catch(() => {});
  }, [sinkId]);

  if (!stream) return null;
  return <audio ref={ref} autoPlay playsInline muted={deafened} className="hidden" />;
}
