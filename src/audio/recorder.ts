function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  return options.find((m) => MediaRecorder.isTypeSupported(m));
}

export interface RecordingHandle {
  stop: () => Promise<Blob>;
}

/** Grava a partir do mesmo stream do detector, para não pedir o microfone duas vezes. */
export function startRecording(stream: MediaStream): RecordingHandle {
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start();
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }));
        if (rec.state !== 'inactive') rec.stop();
      }),
  };
}
