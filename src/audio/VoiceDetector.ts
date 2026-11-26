import { getCtx, unlockAudio } from './context';

export interface VoiceSegment {
  durationMs: number;
  /** Estimativa de sílabas pelos picos de energia (aproximada, só para animação). */
  syllables: number;
}

interface EnvPoint {
  t: number;
  v: number;
}

/**
 * Detecta quando a criança emite voz, sem reconhecer palavras.
 *
 * Decisões de projeto:
 * - Filtro passa-faixa (250–3500 Hz) para ignorar zumbido grave e chiado.
 * - Limiar relativo ao ruído do ambiente (medido na calibração), ajustável
 *   pela sensibilidade, para não frustrar quem fala baixinho.
 * - O nível mostrado na tela tem teto: gritar não deixa o poder mais forte.
 *   A força da animação vem da duração e do número de sílabas.
 * - Todo o processamento é local; nenhum áudio sai do aparelho.
 */
export class VoiceDetector {
  stream: MediaStream | null = null;
  noiseFloor = 0.01;
  sensitivity = 5;
  minDurationMs = 250;

  onLevel?: (level: number) => void;
  onVoiceStart?: () => void;
  onSegment?: (segment: VoiceSegment) => void;

  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(1024);
  private raf = 0;
  private smooth = 0;

  private listening = false;
  private inVoice = false;
  private aboveFrames = 0;
  private lastAbove = 0;
  private segStart = 0;
  private envelope: EnvPoint[] = [];

  private calSamples: number[] | null = null;

  get started(): boolean {
    return this.analyser !== null;
  }

  async start(): Promise<void> {
    await unlockAudio();
    if (this.analyser) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    const ctx = getCtx();
    const src = ctx.createMediaStreamSource(this.stream);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 250;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3500;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);
    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(this.analyser);
    this.loop();
  }

  /** Limiar de voz: quanto maior a sensibilidade, mais perto do ruído do ambiente. */
  threshold(): number {
    const factor = 6 - ((this.sensitivity - 1) * 4.2) / 9; // 6x … 1,8x o ruído
    return Math.max(0.003, this.noiseFloor * factor);
  }

  /** Mede o ruído do ambiente. Peça silêncio durante a medição. */
  async calibrate(ms = 1500): Promise<number> {
    await this.start();
    this.calSamples = [];
    await new Promise((r) => setTimeout(r, ms));
    const samples = this.calSamples.sort((a, b) => a - b);
    this.calSamples = null;
    const median = samples.length ? samples[Math.floor(samples.length / 2)] : 0.005;
    this.noiseFloor = Math.max(0.002, median);
    return this.noiseFloor;
  }

  listen(): void {
    this.listening = true;
    this.inVoice = false;
    this.aboveFrames = 0;
    this.envelope = [];
  }

  stopListening(): void {
    this.listening = false;
    this.inVoice = false;
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    this.smooth = this.smooth * 0.6 + rms * 0.4;

    if (this.calSamples) {
      this.calSamples.push(rms);
      return;
    }

    const th = this.threshold();
    // 0,4 na barra = limiar. Acima de 2,5x o limiar a barra fica cheia (teto).
    this.onLevel?.(Math.min(1, this.smooth / (th * 2.5)));
    if (!this.listening) return;

    const now = performance.now();
    if (this.smooth > th) {
      this.aboveFrames++;
      this.lastAbove = now;
    } else {
      this.aboveFrames = 0;
    }

    if (!this.inVoice && this.aboveFrames >= 3) {
      this.inVoice = true;
      this.segStart = now - 50;
      this.envelope = [];
      this.onVoiceStart?.();
    }

    if (this.inVoice) {
      this.envelope.push({ t: now, v: this.smooth });
      const silentFor = now - this.lastAbove;
      const duration = this.lastAbove - this.segStart;
      // 450 ms de silêncio encerra a fala (crianças pausam entre sílabas)
      if (silentFor > 450 || duration > 5000) {
        this.inVoice = false;
        if (duration >= this.minDurationMs) {
          this.listening = false;
          this.onSegment?.({ durationMs: Math.round(duration), syllables: countSyllables(this.envelope, th) });
        }
      }
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }
}

/** Conta picos de energia separados por vales: uma estimativa grosseira de sílabas. */
export function countSyllables(env: EnvPoint[], th: number): number {
  let count = 0;
  let armed = true;
  let curMax = 0;
  let curMaxT = 0;
  let lastPeakT = -Infinity;
  let valley = Infinity;
  for (const p of env) {
    if (armed) {
      if (p.v > curMax) {
        curMax = p.v;
        curMaxT = p.t;
      }
      if (curMax > th * 1.2 && p.v < curMax * 0.65 && curMaxT - lastPeakT > 130) {
        count++;
        lastPeakT = curMaxT;
        armed = false;
        valley = p.v;
      }
    } else {
      valley = Math.min(valley, p.v);
      if (p.v > valley * 1.4 && p.v > th) {
        armed = true;
        curMax = p.v;
        curMaxT = p.t;
      }
    }
  }
  return Math.max(1, count);
}

export const detector = new VoiceDetector();
