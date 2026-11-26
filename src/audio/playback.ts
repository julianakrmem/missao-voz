import { getCtx } from './context';

let current: AudioBufferSourceNode | null = null;

/** Toca um áudio gravado. A promise resolve quando termina (ou é interrompido). */
export async function playBlob(blob: Blob): Promise<void> {
  stopAll();
  const ctx = getCtx();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return;
  }
  return new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      if (current === src) current = null;
      resolve();
    };
    current = src;
    src.start();
  });
}

/** Voz do celular como reserva, quando ainda não há gravação dos pais. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 0.85;
    u.pitch = 1.15;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
    if (voice) u.voice = voice;
    let finished = false;
    const done = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };
    u.onend = done;
    u.onerror = done;
    setTimeout(done, 3000 + text.length * 120);
    speechSynthesis.speak(u);
  });
}

export function stopAll(): void {
  if (current) {
    try {
      current.stop();
    } catch {
      /* já parou */
    }
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
