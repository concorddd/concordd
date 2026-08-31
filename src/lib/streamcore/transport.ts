/**
 * Transporte WebRTC real (mesh P2P) usando o Realtime do Lovable Cloud
 * como canal de sinalização + presença.
 *
 * Não existem participantes simulados: a lista reflete apenas pessoas
 * realmente conectadas ao canal de voz naquele momento.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RemoteParticipant = {
  id: string;
  name: string;
  initials: string;
  speaking: boolean;
  muted: boolean;
  sharing: boolean;
  stream?: MediaStream | undefined;
};

export type LocalState = { speaking: boolean; muted: boolean; sharing: boolean };

export type ConnectOptions = {
  roomId: string;
  channelId: string;
  userId: string;
  name: string;
};

type PresenceState = {
  user_id: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  sharing: boolean;
};

/**
 * STUN descobre o IP público; TURN é obrigatório quando os dois usuários estão
 * em redes/NATs diferentes (o caso "meu amigo não me ouve"). Sem relay, a
 * conexão P2P simplesmente nunca chega ao estado "connected".
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type PeerEntry = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  ignoreOffer: boolean;
  stream: MediaStream;
  pendingCandidates: RTCIceCandidateInit[];
};

export class MeshTransport {
  private channel: RealtimeChannel | null = null;
  private peers = new Map<string, PeerEntry>();
  private listeners = new Set<(p: RemoteParticipant[]) => void>();
  private presence: Record<string, PresenceState> = {};
  private senders = new Map<MediaStreamTrack, Map<string, RTCRtpSender>>();
  private localTracks = new Set<MediaStreamTrack>();
  private self: ConnectOptions | null = null;
  private state: LocalState = { speaking: false, muted: false, sharing: false };

  private connectionId(userId: string) {
    const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${userId}:${nonce}`;
  }

  async connect(opts: ConnectOptions, initialTracks: MediaStreamTrack[] = []) {
    await this.disconnect();
    // Uma conexão WebRTC precisa de identidade própria. Usar somente o id da
    // conta fazia duas abas/sessões compartilhadas colidirem na mesma presença.
    this.self = { ...opts, userId: this.connectionId(opts.userId) };
    for (const track of initialTracks) {
      this.localTracks.add(track);
      this.senders.set(track, new Map());
    }

    const channel = supabase.channel(`voice:${opts.roomId}:${opts.channelId}`, {
      config: { presence: { key: this.self.userId }, broadcast: { self: false } },
    });
    this.channel = channel;

    channel.on("presence", { event: "sync" }, () => this.syncPresence());
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.onSignal(payload as { from: string; to: string; data: unknown });
    });
    channel.on("broadcast", { event: "bye" }, ({ payload }) => {
      const from = (payload as { from: string }).from;
      this.closePeer(from);
      this.syncPresence();
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Tempo esgotado ao conectar ao canal.")), 12_000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          window.clearTimeout(timeout);
          reject(new Error("Não foi possível abrir o canal em tempo real."));
        }
      });
    });

    await channel.track(this.presencePayload());
  }

  async disconnect() {
    const channel = this.channel;
    this.channel = null;
    if (channel) {
      try {
        await channel.send({
          type: "broadcast",
          event: "bye",
          payload: { from: this.self?.userId },
        });
        await channel.untrack();
      } catch {
        /* ignorar */
      }
      await supabase.removeChannel(channel);
    }
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.senders.clear();
    this.localTracks.clear();
    this.presence = {};
    this.self = null;
    this.emit();
  }

  async setLocalState(state: LocalState) {
    this.state = state;
    if (this.channel) await this.channel.track(this.presencePayload());
  }

  /** Adiciona (ou substitui) uma faixa local publicada para todos os peers. */
  async addTrack(track: MediaStreamTrack) {
    if (this.localTracks.has(track)) return;
    this.localTracks.add(track);
    const map = new Map<string, RTCRtpSender>();
    this.senders.set(track, map);
    for (const [id, peer] of this.peers) {
      try {
        map.set(id, peer.pc.addTrack(track));
      } catch {
        /* ignorar */
      }
    }
  }

  async removeTrack(track: MediaStreamTrack) {
    const map = this.senders.get(track);
    if (map) {
      for (const [id, sender] of map) {
        const peer = this.peers.get(id);
        try {
          peer?.pc.removeTrack(sender);
        } catch {
          /* ignorar */
        }
      }
    }
    this.senders.delete(track);
    this.localTracks.delete(track);
  }

  onParticipants(cb: (p: RemoteParticipant[]) => void) {
    this.listeners.add(cb);
    cb(this.snapshot());
    return () => {
      this.listeners.delete(cb);
    };
  }

  // ---------- interno ----------

  private presencePayload(): PresenceState {
    return {
      user_id: this.self?.userId ?? "",
      name: this.self?.name ?? "",
      speaking: this.state.speaking,
      muted: this.state.muted,
      sharing: this.state.sharing,
    };
  }

  private syncPresence() {
    if (!this.channel || !this.self) return;
    const raw = this.channel.presenceState<PresenceState>();
    const next: Record<string, PresenceState> = {};
    for (const [key, entries] of Object.entries(raw)) {
      const entry = entries[entries.length - 1];
      if (!entry) continue;
      next[key] = { ...entry, user_id: key };
    }
    this.presence = next;

    const others = Object.keys(next).filter((id) => id !== this.self!.userId);
    for (const id of others) if (!this.peers.has(id)) this.createPeer(id);
    for (const id of [...this.peers.keys()]) if (!others.includes(id)) this.closePeer(id);

    this.emit();
  }

  private createPeer(peerId: string) {
    const selfId = this.self!.userId;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = {
      pc,
      // desempate determinístico: o "maior" id é o educado
      polite: selfId > peerId,
      makingOffer: false,
      isSettingRemoteAnswerPending: false,
      ignoreOffer: false,
      stream: new MediaStream(),
      pendingCandidates: [],
    };
    this.peers.set(peerId, entry);

    for (const track of this.localTracks) {
      try {
        const sender = pc.addTrack(track);
        this.senders.get(track)?.set(peerId, sender);
      } catch {
        /* ignorar */
      }
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) void this.signal(peerId, { candidate: candidate.toJSON() });
    };
    pc.ontrack = ({ track }) => {
      // Recria o MediaStream a cada faixa nova para que o <audio>/<video>
      // receba um srcObject novo e volte a tocar (Chrome ignora faixas
      // adicionadas a um stream já atribuído).
      entry.stream = new MediaStream([...entry.stream.getTracks(), track]);
      track.addEventListener("ended", () => {
        entry.stream = new MediaStream(entry.stream.getTracks().filter((t) => t !== track));
        this.emit();
      });
      this.emit();
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        await this.signal(peerId, { description: pc.localDescription?.toJSON() });
      } catch {
        /* ignorar */
      } finally {
        entry.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
    };

    return entry;
  }

  private closePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.stream.getTracks().forEach((t) => t.stop());
    entry.pc.getSenders().forEach((s) => {
      try {
        entry.pc.removeTrack(s);
      } catch {
        /* ignorar */
      }
    });
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onnegotiationneeded = null;
    entry.pc.close();
    this.peers.delete(peerId);
    for (const map of this.senders.values()) map.delete(peerId);
  }

  private async signal(to: string, data: unknown) {
    await this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: { from: this.self?.userId, to, data },
    });
  }

  private async onSignal(payload: { from: string; to: string; data: unknown }) {
    if (!this.self || payload.to !== this.self.userId) return;
    const entry = this.peers.get(payload.from) ?? this.createPeer(payload.from);
    const { pc } = entry;
    const data = payload.data as {
      description?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    };

    try {
      if (data.description) {
        const readyForOffer =
          !entry.makingOffer &&
          (pc.signalingState === "stable" || entry.isSettingRemoteAnswerPending);
        const offerCollision = data.description.type === "offer" && !readyForOffer;
        entry.ignoreOffer = !entry.polite && offerCollision;
        if (entry.ignoreOffer) return;

        entry.isSettingRemoteAnswerPending = data.description.type === "answer";
        try {
          // Navegadores modernos fazem rollback implícito ao receber uma oferta
          // concorrente no lado educado (padrão WebRTC Perfect Negotiation).
          await pc.setRemoteDescription(data.description);
        } finally {
          entry.isSettingRemoteAnswerPending = false;
        }
        for (const c of entry.pendingCandidates.splice(0)) {
          try {
            await pc.addIceCandidate(c);
          } catch {
            /* ignorar candidato inválido */
          }
        }
        if (data.description.type === "offer") {
          await pc.setLocalDescription();
          await this.signal(payload.from, { description: pc.localDescription?.toJSON() });
        }
      } else if (data.candidate) {
        // Candidatos que chegam antes da descrição remota precisam esperar.
        if (!pc.remoteDescription) {
          entry.pendingCandidates.push(data.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {
          /* ignorar candidato inválido */
        }
      }
    } catch {
      /* falhas de negociação são recuperadas na próxima renegociação */
    }
  }

  private snapshot(): RemoteParticipant[] {
    if (!this.self) return [];
    return Object.values(this.presence)
      .filter((p) => p.user_id !== this.self!.userId)
      .map((p) => ({
        id: p.user_id,
        name: p.name || "Convidado",
        initials: initialsOf(p.name || "Convidado"),
        speaking: !!p.speaking && !p.muted,
        muted: !!p.muted,
        sharing: !!p.sharing,
        stream: this.peers.get(p.user_id)?.stream,
      }));
  }

  private emit() {
    const snap = this.snapshot();
    for (const cb of this.listeners) cb(snap);
  }
}

export function createTransport() {
  return new MeshTransport();
}
