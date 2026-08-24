import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDisplayMediaConstraints,
  buildMicConstraints,
  describeTrack,
  type FpsKey,
  type ResolutionKey,
} from "@/lib/streamcore/media";
import { createTransport, type RemoteParticipant } from "@/lib/streamcore/transport";

export type ShareStats = { width: number; height: number; fps: number; label: string } | null;

export function useMediaEngine() {
  const transport = useMemo(() => createTransport("local"), []);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devices, setDevices] = useState<{ mics: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }>({
    mics: [],
    speakers: [],
  });
  const [micId, setMicId] = useState<string | undefined>(undefined);
  const [speakerId, setSpeakerId] = useState<string | undefined>(undefined);

  const [resolution, setResolution] = useState<ResolutionKey>("1080p");
  const [fps, setFps] = useState<FpsKey>(60);
  const [systemAudio, setSystemAudio] = useState(true);
  const [shareStats, setShareStats] = useState<ShareStats>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => transport.onParticipants(setParticipants), [transport]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      mics: list.filter((d) => d.kind === "audioinput"),
      speakers: list.filter((d) => d.kind === "audiooutput"),
    });
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
    setSpeaking(false);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    stopMeter();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!;
      const rms = Math.sqrt(sum / buf.length);
      const value = Math.min(1, rms * 6);
      setLevel(value);
      // VAD simples com limiar
      setSpeaking(value > 0.08);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopMeter]);

  const join = useCallback(
    async (roomId: string, channelId: string, identity: string) => {
      setError(null);
      setConnecting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(buildMicConstraints(micId));
        micStreamRef.current = stream;
        const track = stream.getAudioTracks()[0];
        if (track) track.enabled = micOn;
        startMeter(stream);
        await transport.connect({ roomId, channelId, identity });
        await transport.publishAudio(track ?? null);
        await refreshDevices();
        setConnected(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível acessar o microfone.");
      } finally {
        setConnecting(false);
      }
    },
    [micId, micOn, refreshDevices, startMeter, transport],
  );

  const stopShare = useCallback(async () => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setSharing(false);
    setShareStats(null);
    await transport.publishScreen(null);
  }, [screenStream, transport]);

  const leave = useCallback(async () => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    stopMeter();
    await stopShare();
    await transport.disconnect();
    setConnected(false);
  }, [stopMeter, stopShare, transport]);

  const startShare = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(
        buildDisplayMediaConstraints({ resolution, fps, systemAudio }),
      );
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack?.addEventListener("ended", () => {
        setScreenStream(null);
        setSharing(false);
        setShareStats(null);
      });
      setScreenStream(stream);
      setSharing(true);
      setShareStats(describeTrack(videoTrack));
      await transport.publishScreen(stream);
    } catch (e) {
      if (e instanceof Error && e.name === "NotAllowedError") return;
      setError(e instanceof Error ? e.message : "Falha ao iniciar a transmissão.");
    }
  }, [fps, resolution, systemAudio, transport]);

  const applyShareQuality = useCallback(
    async (nextRes: ResolutionKey, nextFps: FpsKey) => {
      setResolution(nextRes);
      setFps(nextFps);
      const track = screenStream?.getVideoTracks()[0];
      if (!track) return;
      const c = buildDisplayMediaConstraints({ resolution: nextRes, fps: nextFps, systemAudio })
        .video as MediaTrackConstraints;
      try {
        await track.applyConstraints(c);
        setShareStats(describeTrack(track));
      } catch {
        /* alguns navegadores não permitem reconfigurar em tempo real */
      }
    },
    [screenStream, systemAudio],
  );

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const next = !prev;
      if (next) {
        micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
        setMicOn(false);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    connected,
    connecting,
    micOn,
    deafened,
    sharing,
    level,
    speaking,
    error,
    devices,
    micId,
    speakerId,
    resolution,
    fps,
    systemAudio,
    shareStats,
    screenStream,
    participants,
    setMicId,
    setSpeakerId,
    setSystemAudio,
    setError,
    refreshDevices,
    startMeter,
    stopMeter,
    applyShareQuality,
    join,
    leave,
    startShare,
    stopShare,
    toggleMic,
    toggleDeafen,
  };
}

export type MediaEngine = ReturnType<typeof useMediaEngine>;
