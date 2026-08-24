/**
 * Camada de transporte plugável.
 *
 * O app fala apenas com a interface `RtcTransport`, então dá para trocar o
 * backend de mídia (LiveKit, Simple-Peer/PeerJS ou WebRTC P2P puro) sem
 * mexer na UI. Por padrão usamos o `LocalTransport`, que roda a mídia
 * localmente (loopback) — basta plugar um servidor de sinalização para
 * habilitar as outras implementações.
 */

export type RemoteParticipant = {
  id: string;
  name: string;
  initials: string;
  speaking: boolean;
  muted: boolean;
  sharing: boolean;
  stream?: MediaStream;
};

export type TransportKind = "local" | "livekit" | "p2p";

export interface RtcTransport {
  readonly kind: TransportKind;
  connect(opts: { roomId: string; channelId: string; identity: string }): Promise<void>;
  disconnect(): Promise<void>;
  publishAudio(track: MediaStreamTrack | null): Promise<void>;
  publishScreen(stream: MediaStream | null): Promise<void>;
  onParticipants(cb: (participants: RemoteParticipant[]) => void): () => void;
}

class LocalTransport implements RtcTransport {
  readonly kind: TransportKind = "local";
  private listeners = new Set<(p: RemoteParticipant[]) => void>();
  private participants: RemoteParticipant[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  async connect() {
    // Participantes de demonstração enquanto não há servidor de sinalização.
    this.participants = [
      { id: "p1", name: "Ana Duarte", initials: "AD", speaking: false, muted: false, sharing: false },
      { id: "p2", name: "Rafa Lopes", initials: "RL", speaking: false, muted: true, sharing: false },
      { id: "p3", name: "Marina Sá", initials: "MS", speaking: false, muted: false, sharing: false },
    ];
    this.emit();
    this.timer = setInterval(() => {
      this.participants = this.participants.map((p) => ({
        ...p,
        speaking: !p.muted && Math.random() > 0.65,
      }));
      this.emit();
    }, 1600);
  }

  async disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.participants = [];
    this.emit();
  }

  async publishAudio() {}
  async publishScreen() {}

  onParticipants(cb: (p: RemoteParticipant[]) => void) {
    this.listeners.add(cb);
    cb(this.participants);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb([...this.participants]);
  }
}

export function createTransport(kind: TransportKind = "local"): RtcTransport {
  switch (kind) {
    case "livekit":
    case "p2p":
      // Ponto de extensão: instanciar LiveKit Room ou Simple-Peer aqui.
      return new LocalTransport();
    default:
      return new LocalTransport();
  }
}
