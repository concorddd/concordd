export type ResolutionKey = "720p" | "1080p" | "1440p" | "4k";
export type FpsKey = 30 | 60;

export const RESOLUTIONS: Record<
  ResolutionKey,
  { label: string; width: number; height: number; bandwidth: string; warn?: boolean }
> = {
  "720p": { label: "720p HD", width: 1280, height: 720, bandwidth: "~2,5 Mbps" },
  "1080p": { label: "1080p Full HD", width: 1920, height: 1080, bandwidth: "~5 Mbps" },
  "1440p": { label: "1440p QHD", width: 2560, height: 1440, bandwidth: "~12 Mbps" },
  "4k": { label: "4K UHD", width: 3840, height: 2160, bandwidth: "~35 Mbps", warn: true },
};

export const RESOLUTION_ORDER: ResolutionKey[] = ["720p", "1080p", "1440p", "4k"];

export type ScreenShareOptions = {
  resolution: ResolutionKey;
  fps: FpsKey;
  systemAudio: boolean;
};

export function buildDisplayMediaConstraints(options: ScreenShareOptions): DisplayMediaStreamOptions {
  const res = RESOLUTIONS[options.resolution];
  return {
    video: {
      width: { ideal: res.width, max: res.width },
      height: { ideal: res.height, max: res.height },
      frameRate: { ideal: options.fps, max: options.fps },
      cursor: "motion",
      displaySurface: "monitor",
    },
    audio: options.systemAudio
      ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          systemAudio: "include",
        }
      : false,
  } as DisplayMediaStreamOptions;
}

export function buildMicConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  };
}

export function supportsDisplayMedia() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
}

/** Celulares não expõem getDisplayMedia — a transmissão é feita do PC. */
export function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function describeTrack(track: MediaStreamTrack | undefined) {
  if (!track) return null;
  const s = track.getSettings();
  return {
    width: s.width ?? 0,
    height: s.height ?? 0,
    fps: Math.round(s.frameRate ?? 0),
    label: track.label,
  };
}
