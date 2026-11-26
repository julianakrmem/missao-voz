import { useEffect } from 'react';
import { Stars } from '../components/Stars';
import { sparkle } from '../audio/sfx';
import type { Theme } from '../types';

export function Done({ theme, words, onHome }: { theme: Theme; words: number; onHome: () => void }) {
  const { Hero } = theme;
  useEffect(() => {
    sparkle();
    const t = window.setTimeout(sparkle, 500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="screen done">
      <Stars count={18} />
      <div className="done__hero">
        <Hero mood="happy" />
      </div>
      <div className="done__score" aria-label={`${words} estrelas`}>
        {'⭐'.repeat(words)}
      </div>
      <button type="button" className="big-play big-play--home" onClick={onHome} aria-label="Voltar ao início">
        🏠
      </button>
    </main>
  );
}
