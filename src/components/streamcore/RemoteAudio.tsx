import { useEffect, useRef } from "react";

/** Reproduz o áudio de um participante remoto, respeitando o dispositivo de saída escolhido. */
export function RemoteAudio({
  stream,
  deafened,
  sinkId,
}: {
  stream?: MediaStream;
  deafened: boolean;
  sinkId?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId || !sinkId) return;
    el.setSinkId(sinkId).catch(() => {});
  }, [sinkId]);

  if (!stream) return null;
  return <audio ref={ref} autoPlay playsInline muted={deafened} className="hidden" />;
}
