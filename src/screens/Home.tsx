import { useState } from 'react';
import { HoldButton } from '../components/HoldButton';
import type { Theme } from '../types';

interface Props {
  theme: Theme;
  onPlay: () => Promise<void>;
  onParent: () => void;
}

export function Home({ theme, onPlay, onParent }: Props) {
  const [micError, setMicError] = useState(false);
  const [busy, setBusy] = useState(false);
  const { Hero } = theme;

  const play = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPlay();
    } catch {
      setMicError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen home">
      <HoldButton holdMs={3000} onHold={onParent} className="corner corner--right" label="Área dos pais: segure 3 segundos">
        ⚙️
      </HoldButton>

      <div className="home__hero">
        <Hero mood="idle" />
      </div>

      <button type="button" className="big-play" onClick={play} aria-label="Começar missão">
        ▶
      </button>

      {micError && (
        <p className="adult-note">
          🎤 Não consegui usar o microfone. Um adulto precisa permitir o acesso nas configurações do navegador e tocar
          em ▶ de novo.
        </p>
      )}
    </main>
  );
}
