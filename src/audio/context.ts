// Um único AudioContext para microfone, efeitos e reprodução.
// No iOS ele só "destrava" depois de um toque do usuário, por isso
// chamamos unlockAudio() dentro do clique no botão de jogar.
let ctx: AudioContext | null = null;

export function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c.state !== 'running') await c.resume();
}
