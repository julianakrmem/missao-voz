import type { Level, Word } from '../types';
import type { VoiceSegment } from '../audio/VoiceDetector';

/**
 * Banco inicial ordenado pela aquisição fonológica típica do português:
 * vogais e sons labiais/plosivos (P, B, M, T, D) primeiro; LH, NH, R e
 * encontros consonantais ficam de fora porque costumam firmar mais tarde.
 *
 * É só um ponto de partida: valide e ajuste a lista com a fonoaudióloga.
 */
export const WORDS: Word[] = [
  // Nível 1: vogais e onomatopeias, para destravar a emissão sem pressão
  { id: 'aaa', text: 'Aaaah!', emoji: '😮', level: 1, syllables: 1 },
  { id: 'uau', text: 'Uau!', emoji: '🤩', level: 1, syllables: 1 },
  { id: 'ai', text: 'Ai!', emoji: '😲', level: 1, syllables: 1 },
  { id: 'oi', text: 'Oi!', emoji: '👋', level: 1, syllables: 1 },
  { id: 'pum', text: 'Pum!', emoji: '💥', level: 1, syllables: 1 },
  { id: 'bum', text: 'Bum!', emoji: '🥁', level: 1, syllables: 1 },
  { id: 'upa', text: 'Upa!', emoji: '⬆️', level: 1, syllables: 2 },
  { id: 'oba', text: 'Oba!', emoji: '🎉', level: 1, syllables: 2 },

  // Nível 2: palavras com sons precoces
  { id: 'pe', text: 'Pé', emoji: '🦶', level: 2, syllables: 1 },
  { id: 'mao', text: 'Mão', emoji: '✋', level: 2, syllables: 1 },
  { id: 'bola', text: 'Bola', emoji: '⚽', level: 2, syllables: 2 },
  { id: 'papai', text: 'Papai', emoji: '👨', level: 2, syllables: 2 },
  { id: 'mamae', text: 'Mamãe', emoji: '👩', level: 2, syllables: 2 },
  { id: 'dedo', text: 'Dedo', emoji: '☝️', level: 2, syllables: 2 },
  { id: 'bebe', text: 'Bebê', emoji: '👶', level: 2, syllables: 2 },
  { id: 'pato', text: 'Pato', emoji: '🦆', level: 2, syllables: 2 },
  { id: 'boca', text: 'Boca', emoji: '👄', level: 2, syllables: 2 },
  { id: 'uva', text: 'Uva', emoji: '🍇', level: 2, syllables: 2 },
  { id: 'pipoca', text: 'Pipoca', emoji: '🍿', level: 2, syllables: 3 },

  // Nível 3: duas palavras juntas
  { id: 'mais-um', text: 'Mais um!', emoji: '➕', level: 3, syllables: 2 },
  { id: 'bom-dia', text: 'Bom dia!', emoji: '☀️', level: 3, syllables: 3 },
  { id: 'tchau-tchau', text: 'Tchau, tchau!', emoji: '👋', level: 3, syllables: 2 },
  { id: 'oi-mamae', text: 'Oi, mamãe!', emoji: '👩', level: 3, syllables: 4 },
  { id: 'oi-papai', text: 'Oi, papai!', emoji: '👨', level: 3, syllables: 4 },
  { id: 'da-a-bola', text: 'Dá a bola!', emoji: '⚽', level: 3, syllables: 3 },
  { id: 'pula-pula', text: 'Pula, pula!', emoji: '🐸', level: 3, syllables: 4 },
];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWords(level: Level, count: number, extra: Word[] = []): Word[] {
  const pool = [...WORDS, ...extra].filter((w) => w.level === level);
  if (!pool.length) return [];
  const out: Word[] = [];
  while (out.length < count) out.push(...shuffle(pool));
  return out.slice(0, count);
}

/** Força da animação (1 a 3). Toda tentativa ganha pelo menos 1: não existe "errado". */
export function powerStrength(seg: VoiceSegment, word: Word): 1 | 2 | 3 {
  const bySyllables = Math.min(1, seg.syllables / word.syllables);
  const byDuration = Math.min(1, seg.durationMs / (word.syllables * 250));
  const score = Math.max(bySyllables, byDuration);
  return score < 0.5 ? 1 : score < 0.9 ? 2 : 3;
}
