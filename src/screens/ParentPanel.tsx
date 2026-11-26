import { useEffect, useMemo, useRef, useState } from 'react';
import { detector, type VoiceSegment } from '../audio/VoiceDetector';
import { playBlob } from '../audio/playback';
import { startRecording, type RecordingHandle } from '../audio/recorder';
import { WORDS } from '../data/words';
import {
  addRecording,
  clearAttempts,
  deleteRecording,
  listAttempts,
  listRecordings,
  newId,
} from '../storage/db';
import { THEMES, getTheme } from '../themes';
import type { Attempt, Level, Recording, RecordingKind, Settings } from '../types';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

const MAX_RECORD_MS = 8000;

export function ParentPanel({ settings, onChange, onClose }: Props) {
  const [micReady, setMicReady] = useState(detector.started);
  const [micError, setMicError] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const theme = getTheme(settings.themeId);
  const allWords = useMemo(() => [...WORDS, ...(theme.extraWords ?? [])], [theme]);
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const refresh = async () => {
    setRecordings(await listRecordings());
    setAttempts(await listAttempts());
  };

  useEffect(() => {
    refresh();
  }, []);

  const enableMic = async () => {
    try {
      await detector.start();
      setMicReady(true);
      setMicError('');
    } catch {
      setMicError('O navegador não liberou o microfone. Verifique a permissão do site (e use HTTPS).');
    }
  };

  return (
    <main className="screen panel">
      <header className="panel__header">
        <h1>Área dos pais</h1>
        <button type="button" className="btn" onClick={onClose}>
          Voltar para a brincadeira
        </button>
      </header>

      {!micReady && (
        <section className="card">
          <p>Para calibrar o microfone e gravar áudios, libere o microfone.</p>
          <button type="button" className="btn btn--primary" onClick={enableMic}>
            🎤 Liberar microfone
          </button>
          {micError && <p className="error">{micError}</p>}
        </section>
      )}

      {micReady && <MicSection settings={settings} update={update} />}

      <section className="card">
        <h2>Missão</h2>
        <label className="field">
          Nível
          <select value={settings.level} onChange={(e) => update({ level: Number(e.target.value) as Level })}>
            <option value={1}>1. Vogais e onomatopeias</option>
            <option value={2}>2. Palavras simples</option>
            <option value={3}>3. Duas palavras</option>
          </select>
        </label>
        <label className="field">
          Palavras por missão
          <select value={settings.sessionSize} onChange={(e) => update({ sessionSize: Number(e.target.value) })}>
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Tema
          <select value={settings.themeId} onChange={(e) => update({ themeId: e.target.value })}>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={settings.useTTS} onChange={(e) => update({ useTTS: e.target.checked })} />
          Usar a voz do celular quando não houver gravação
        </label>
      </section>

      {micReady && (
        <>
          <RecordingList
            title="Comemorações"
            hint='Ex.: "Isso mesmo, campeão!", "Que poder incrível!". Tocam aleatoriamente quando ele tenta.'
            kind="cheer"
            recordings={recordings}
            onChanged={refresh}
          />
          <RecordingList
            title="Incentivos"
            hint='Ex.: "Quase! Vamos juntos de novo?". Tocam quando ele fica em silêncio.'
            kind="encourage"
            recordings={recordings}
            onChanged={refresh}
          />
          <WordModels words={allWords.filter((w) => w.level === settings.level)} recordings={recordings} onChanged={refresh} />
        </>
      )}

      <ProgressSection attempts={attempts} words={allWords} onCleared={refresh} />
    </main>
  );
}

function MicSection({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [level, setLevel] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [last, setLast] = useState<VoiceSegment | null>(null);

  useEffect(() => {
    detector.onLevel = setLevel;
    detector.onSegment = (seg) => {
      setLast(seg);
      detector.listen();
    };
    detector.listen();
    return () => {
      detector.onLevel = undefined;
      detector.onSegment = undefined;
      detector.stopListening();
    };
  }, []);

  const calibrate = async () => {
    setCalibrating(true);
    const noiseFloor = await detector.calibrate();
    setCalibrating(false);
    update({ noiseFloor, calibrated: true });
    detector.listen();
  };

  return (
    <section className="card">
      <h2>Microfone</h2>
      <div className="meter" aria-label="Nível do microfone">
        <div className="meter__fill" style={{ width: `${level * 100}%` }} />
        <div className="meter__threshold" title="Limiar de voz" />
      </div>
      <p className="hint">
        A linha marca o limiar. Fale perto do celular: a barra deve passar da linha com a voz normal dele, sem precisar
        gritar. A barra tem teto de propósito.
      </p>
      {last && (
        <p className="hint">
          Última voz: {(last.durationMs / 1000).toFixed(1)} s, cerca de {last.syllables} sílaba(s)
        </p>
      )}
      <button type="button" className="btn" onClick={calibrate} disabled={calibrating}>
        {calibrating ? 'Medindo… fique em silêncio' : '🤫 Calibrar ruído do ambiente'}
      </button>
      <label className="field">
        Sensibilidade: {settings.sensitivity}
        <input
          type="range"
          min={1}
          max={10}
          value={settings.sensitivity}
          onChange={(e) => update({ sensitivity: Number(e.target.value) })}
        />
      </label>
      <p className="hint">Se ele fala baixinho e o herói não reage, aumente a sensibilidade.</p>
    </section>
  );
}

function RecorderButton({ onRecorded, label = '⏺ Gravar' }: { onRecorded: (b: Blob) => void; label?: string }) {
  const [rec, setRec] = useState<RecordingHandle | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const stop = async (handle: RecordingHandle) => {
    window.clearTimeout(timer.current);
    setRec(null);
    onRecorded(await handle.stop());
  };

  const toggle = () => {
    if (rec) return void stop(rec);
    if (!detector.stream) return;
    const handle = startRecording(detector.stream);
    setRec(handle);
    timer.current = window.setTimeout(() => stop(handle), MAX_RECORD_MS);
  };

  return (
    <button type="button" className={`btn ${rec ? 'btn--recording' : 'btn--primary'}`} onClick={toggle}>
      {rec ? '⏹ Parar' : label}
    </button>
  );
}

function RecordingList(props: {
  title: string;
  hint: string;
  kind: RecordingKind;
  recordings: Recording[];
  onChanged: () => void;
}) {
  const items = props.recordings.filter((r) => r.kind === props.kind);
  const save = async (blob: Blob) => {
    await addRecording({ id: newId(), kind: props.kind, blob, createdAt: Date.now() });
    props.onChanged();
  };
  return (
    <section className="card">
      <h2>{props.title}</h2>
      <p className="hint">{props.hint}</p>
      <ul className="rec-list">
        {items.map((r, i) => (
          <li key={r.id}>
            <span>Áudio {i + 1}</span>
            <button type="button" className="btn" onClick={() => playBlob(r.blob)}>
              ▶
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                await deleteRecording(r.id);
                props.onChanged();
              }}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
      <RecorderButton onRecorded={save} />
    </section>
  );
}

function WordModels({
  words,
  recordings,
  onChanged,
}: {
  words: { id: string; text: string; emoji: string }[];
  recordings: Recording[];
  onChanged: () => void;
}) {
  return (
    <section className="card">
      <h2>Sua voz falando as palavras</h2>
      <p className="hint">
        Opcional. Fale devagar, bem articulado, como modelo para ele imitar. Sem gravação, o app usa a voz do celular.
      </p>
      <ul className="rec-list">
        {words.map((w) => {
          const model = recordings.find((r) => r.kind === 'word' && r.wordId === w.id);
          return (
            <li key={w.id}>
              <span>
                {w.emoji} {w.text}
              </span>
              {model ? (
                <>
                  <button type="button" className="btn" onClick={() => playBlob(model.blob)}>
                    ▶
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      await deleteRecording(model.id);
                      onChanged();
                    }}
                  >
                    🗑
                  </button>
                </>
              ) : (
                <RecorderButton
                  label="⏺"
                  onRecorded={async (blob) => {
                    await addRecording({ id: newId(), kind: 'word', wordId: w.id, blob, createdAt: Date.now() });
                    onChanged();
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProgressSection({
  attempts,
  words,
  onCleared,
}: {
  attempts: Attempt[];
  words: { id: string; text: string; emoji: string }[];
  onCleared: () => void;
}) {
  const rows = useMemo(() => {
    const byWord = new Map<string, { tentativas: number; acertos: number; semVoz: number; ultima: number }>();
    for (const a of attempts) {
      const row = byWord.get(a.wordId) ?? { tentativas: 0, acertos: 0, semVoz: 0, ultima: 0 };
      if (a.mark === 'sem-voz') row.semVoz++;
      else row.tentativas++;
      if (a.mark === 'acertou') row.acertos++;
      row.ultima = Math.max(row.ultima, a.at);
      byWord.set(a.wordId, row);
    }
    return [...byWord.entries()]
      .map(([id, r]) => ({ word: words.find((w) => w.id === id), id, ...r }))
      .sort((a, b) => b.ultima - a.ultima);
  }, [attempts, words]);

  const exportJson = () => {
    const data = { exportadoEm: new Date().toISOString(), resumo: rows, tentativas: attempts };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `missao-voz-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card">
      <h2>Progresso</h2>
      <p className="hint">"Acertos" são os que você marcou com ✓ durante a missão. Toda tentativa já é uma vitória.</p>
      {rows.length === 0 ? (
        <p>Nenhuma missão jogada ainda.</p>
      ) : (
        <table className="progress-table">
          <thead>
            <tr>
              <th>Palavra</th>
              <th>Tentativas</th>
              <th>Acertos ✓</th>
              <th>Sem voz</th>
              <th>Última vez</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.word ? `${r.word.emoji} ${r.word.text}` : r.id}
                </td>
                <td>{r.tentativas}</td>
                <td>{r.acertos}</td>
                <td>{r.semVoz}</td>
                <td>{new Date(r.ultima).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row">
        <button type="button" className="btn" onClick={exportJson} disabled={!attempts.length}>
          ⬇ Exportar para a fono (JSON)
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={!attempts.length}
          onClick={async () => {
            if (window.confirm('Apagar todo o histórico de tentativas?')) {
              await clearAttempts();
              onCleared();
            }
          }}
        >
          Apagar histórico
        </button>
      </div>
    </section>
  );
}
