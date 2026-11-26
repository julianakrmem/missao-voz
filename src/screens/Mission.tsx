import { useEffect, useMemo, useRef, useState } from 'react';
import { detector } from '../audio/VoiceDetector';
import { playBlob, speak, stopAll, wait } from '../audio/playback';
import * as sfx from '../audio/sfx';
import { pickWords, powerStrength } from '../data/words';
import { addAttempt, listRecordings, markAttempt } from '../storage/db';
import { HoldButton } from '../components/HoldButton';
import { Stars } from '../components/Stars';
import type { HeroMood, Recording, Settings, Theme, Word } from '../types';

type Phase = 'intro' | 'listening' | 'encourage' | 'firing' | 'caught';

const MOOD: Record<Phase, HeroMood> = {
  intro: 'idle',
  listening: 'listening',
  encourage: 'encourage',
  firing: 'firing',
  caught: 'happy',
};

const SILENCE_MS = 9000; // espera antes de incentivar
const MAX_NUDGES = 2; // depois disso, segue para o próximo sem drama

interface Props {
  settings: Settings;
  theme: Theme;
  onExit: () => void;
  onDone: (wordsPlayed: number) => void;
}

interface Voices {
  cheers: Recording[];
  encourage: Recording[];
  models: Map<string, Recording>;
}

const randomOf = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

/** Rede de teia (desenho genérico) que prende o alvo. */
function WebNet({ color }: { color: string }) {
  const rings = [14, 28, 42];
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg className="web-net" viewBox="-50 -50 100 100" aria-hidden>
      <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round">
        {spokes.map((a, i) => (
          <line key={i} x1="0" y1="0" x2={Math.cos(a) * 46} y2={Math.sin(a) * 46} />
        ))}
        {rings.map((r) => (
          <polygon
            key={r}
            points={spokes.map((a) => `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`).join(' ')}
          />
        ))}
      </g>
    </svg>
  );
}

export function Mission({ settings, theme, onExit, onDone }: Props) {
  const words = useMemo(
    () => pickWords(settings.level, settings.sessionSize, theme.extraWords),
    [settings.level, settings.sessionSize, theme],
  );
  const [voices, setVoices] = useState<Voices | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState(0);
  const [strength, setStrength] = useState<1 | 2 | 3>(2);
  const [marked, setMarked] = useState(false);
  const attemptId = useRef<number | null>(null);
  const replay = useRef<() => void>(() => {});
  const word: Word | undefined = words[idx];
  const { Hero, Target } = theme;

  // Carrega as vozes gravadas pelos pais uma vez por missão
  useEffect(() => {
    listRecordings().then((all) => {
      const models = new Map<string, Recording>();
      all.filter((r) => r.kind === 'word' && r.wordId).forEach((r) => models.set(r.wordId!, r));
      setVoices({
        cheers: all.filter((r) => r.kind === 'cheer'),
        encourage: all.filter((r) => r.kind === 'encourage'),
        models,
      });
    });
    detector.onLevel = setLevel;
    return () => {
      detector.onLevel = undefined;
      detector.onSegment = undefined;
      detector.stopListening();
      stopAll();
    };
  }, []);

  // Ciclo de cada palavra: modelo → escuta → poder → comemoração → próxima
  useEffect(() => {
    if (!voices || !word) return;
    let cancelled = false;
    let silenceTimer: number | undefined;
    let nudges = 0;
    attemptId.current = null;
    setMarked(false);

    const say = async (rec: Recording | undefined, fallback: string | undefined) => {
      if (rec) await playBlob(rec.blob);
      else if (settings.useTTS && fallback) await speak(fallback);
    };
    const playModel = () => say(voices.models.get(word.id), word.text);

    const advance = () => {
      if (cancelled) return;
      if (idx + 1 >= words.length) onDone(words.length);
      else setIdx(idx + 1);
    };

    const listen = () => {
      if (cancelled) return;
      setPhase('listening');
      detector.listen();
      silenceTimer = window.setTimeout(onSilence, SILENCE_MS);
    };

    const onSilence = async () => {
      detector.stopListening();
      if (nudges >= MAX_NUDGES) {
        await addAttempt({ wordId: word.id, at: Date.now(), durationMs: 0, syllables: 0, mark: 'sem-voz' });
        advance();
        return;
      }
      nudges++;
      setPhase('encourage');
      await say(randomOf(voices.encourage), randomOf(theme.fallbackEncourage));
      if (cancelled) return;
      await playModel();
      listen();
    };

    detector.onSegment = async (seg) => {
      window.clearTimeout(silenceTimer);
      if (cancelled) return;
      const s = powerStrength(seg, word);
      setStrength(s);
      setPhase('firing');
      sfx.power(s);
      attemptId.current = await addAttempt({
        wordId: word.id,
        at: Date.now(),
        durationMs: seg.durationMs,
        syllables: seg.syllables,
        mark: 'tentou',
      });
      await wait(750);
      if (cancelled) return;
      setPhase('caught');
      sfx.sparkle();
      await wait(300);
      await say(randomOf(voices.cheers), randomOf(theme.fallbackCheers));
      await wait(1500); // tempo para o adulto marcar "acertou"
      advance();
    };

    // Tocar no alvo repete o modelo da palavra (causa e efeito)
    replay.current = async () => {
      window.clearTimeout(silenceTimer);
      detector.stopListening();
      setPhase('intro');
      await playModel();
      listen();
    };

    (async () => {
      setPhase('intro');
      sfx.pop();
      await wait(700);
      if (cancelled) return;
      await playModel();
      listen();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(silenceTimer);
      detector.stopListening();
      detector.onSegment = undefined;
      stopAll();
    };
  }, [voices, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const markCorrect = async () => {
    if (attemptId.current == null || marked) return;
    setMarked(true);
    await markAttempt(attemptId.current, 'acertou');
  };

  if (!word) return null;
  const caught = phase === 'caught';

  return (
    <main className={`screen mission mission--${phase}`}>
      <HoldButton holdMs={1500} onHold={onExit} className="corner corner--left" label="Sair: segure">
        🏠
      </HoldButton>

      <button
        type="button"
        className={`adult-mark ${marked ? 'adult-mark--on' : ''}`}
        onClick={markCorrect}
        disabled={attemptId.current == null}
        aria-label="Adulto: marcar que falou certo"
      >
        ✓
      </button>

      <div className="progress" aria-hidden>
        {words.map((w, i) => (
          <span key={`${w.id}-${i}`} className={i < idx || (i === idx && caught) ? 'progress__done' : ''}>
            ⭐
          </span>
        ))}
      </div>

      <button type="button" className="mission__target" onClick={() => replay.current()} aria-label={`Ouvir: ${word.text}`}>
        <Target caught={caught} />
        {caught && theme.beam === 'web' && <WebNet color={theme.colors.power} />}
        <span className="mission__emoji">{word.emoji}</span>
        <span className="mission__word">{word.text}</span>
      </button>

      <svg className="beam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {(phase === 'firing' || caught) &&
          (theme.beam === 'web'
            ? Array.from({ length: strength + 1 }, (_, i) => (
                <line
                  key={i}
                  x1="21"
                  y1={72 + i * 1.5}
                  x2={72 + i * 2}
                  y2={28 + i * 3}
                  pathLength={100}
                  stroke={theme.colors.power}
                  strokeWidth={0.5}
                  strokeLinecap="round"
                  className="beam__line beam__line--web"
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))
            : Array.from({ length: strength }, (_, i) => (
                <line
                  key={i}
                  x1="21"
                  y1={72 + i * 3}
                  x2="74"
                  y2={30 + i * 3}
                  pathLength={100}
                  stroke={theme.colors.power}
                  strokeWidth={1.6 - i * 0.4}
                  strokeLinecap="round"
                  className="beam__line"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              )))}
      </svg>
      {phase === 'firing' && <div className="power-word">{theme.powerWord}</div>}

      <div className="mission__hero">
        <Hero mood={MOOD[phase]} />
        <div className={`voice-glow ${phase === 'listening' ? 'voice-glow--on' : ''}`} style={{ transform: `scale(${0.6 + level * 0.8})` }} />
      </div>

      {caught && <Stars />}
    </main>
  );
}
