import { useEffect, useState } from "react";
import { AlertTriangle, Mic, Speaker } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOLUTION_ORDER, RESOLUTIONS, buildMicConstraints, type FpsKey } from "@/lib/streamcore/media";
import type { MediaEngine } from "@/hooks/useMediaEngine";

export function MediaSettingsDialog({
  open,
  onOpenChange,
  engine,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  engine: MediaEngine;
}) {
  const [testing, setTesting] = useState(false);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (open) void engine.refreshDevices();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTest = () => {
    testStream?.getTracks().forEach((t) => t.stop());
    setTestStream(null);
    setTesting(false);
    if (!engine.connected) engine.stopMeter();
  };

  useEffect(() => {
    if (!open) stopTest();
    return () => {
      testStream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(buildMicConstraints(engine.micId));
      setTestStream(stream);
      setTesting(true);
      engine.startMeter(stream);
      await engine.refreshDevices();
    } catch {
      engine.setError("Não foi possível acessar o microfone para o teste.");
    }
  };

  const res = RESOLUTIONS[engine.resolution];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Configurações de mídia</DialogTitle>
          <DialogDescription>Dispositivos, teste de áudio e qualidade da transmissão.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Mic className="size-3.5" /> Microfone
            </Label>
            <Select value={engine.micId ?? "default"} onValueChange={(v) => engine.setMicId(v === "default" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Microfone padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Microfone padrão</SelectItem>
                {engine.devices.mics
                  .filter((d) => d.deviceId && d.deviceId !== "default")
                  .map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || "Microfone"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Speaker className="size-3.5" /> Alto-falante
            </Label>
            <Select
              value={engine.speakerId ?? "default"}
              onValueChange={(v) => engine.setSpeakerId(v === "default" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Saída padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Saída padrão</SelectItem>
                {engine.devices.speakers
                  .filter((d) => d.deviceId && d.deviceId !== "default")
                  .map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || "Alto-falante"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Teste de áudio</p>
              <Button size="sm" variant={testing ? "destructive" : "secondary"} onClick={testing ? stopTest : startTest}>
                {testing ? "Parar teste" : "Testar microfone"}
              </Button>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full gradient-primary transition-[width] duration-75"
                style={{ width: `${Math.round(engine.level * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {engine.speaking ? "Voz detectada" : "Fale para ver o nível do microfone"}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Qualidade da transmissão de tela
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={engine.resolution}
                onValueChange={(v) => engine.applyShareQuality(v as typeof engine.resolution, engine.fps)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {RESOLUTIONS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(engine.fps)}
                onValueChange={(v) => engine.applyShareQuality(engine.resolution, Number(v) as FpsKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Consumo estimado: {res.bandwidth} em {engine.fps} FPS.
            </p>
            {res.warn && (
              <div className="flex gap-2 rounded-lg border border-live/40 bg-live/10 p-3 text-xs text-live">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  4K/60fps exige placa de vídeo potente e conexão de upload acima de 35 Mbps. Em redes instáveis
                  a transmissão pode travar.
                </span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Áudio do sistema</p>
                <p className="text-xs text-muted-foreground">Inclui o som do computador na transmissão.</p>
              </div>
              <Switch checked={engine.systemAudio} onCheckedChange={engine.setSystemAudio} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
