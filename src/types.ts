import type { ComponentType } from 'react';

export type Level = 1 | 2 | 3;

export interface Word {
  id: string;
  /** Texto que o adulto lê e que a voz do celular fala, se não houver gravação. */
  text: string;
  /** Pista visual para a criança (ela ainda não lê). */
  emoji: string;
  level: Level;
  /** Sílabas esperadas: usado só para dosar a animação, nunca para dar "erro". */
  syllables: number;
}

export type HeroMood = 'idle' | 'listening' | 'firing' | 'happy' | 'encourage';

export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;
    bgAccent: string;
    primary: string;
    power: string;
    text: string;
  };
  /** Estilo do poder: raio de estrelas ou teia (com rede prendendo o alvo). */
  beam?: 'stars' | 'web';
  /** Palavra mostrada quando o poder sai, ex.: "Zuum!" */
  powerWord: string;
  /** Frases faladas pela voz do celular quando ainda não há áudios gravados. */
  fallbackCheers: string[];
  fallbackEncourage: string[];
  /** Palavras extras do universo do tema (somam às do banco padrão). */
  extraWords?: Word[];
  Hero: ComponentType<{ mood: HeroMood }>;
  Target: ComponentType<{ caught: boolean }>;
}

export interface Settings {
  sensitivity: number; // 1 (pouco sensível) a 10 (muito sensível)
  noiseFloor: number; // ruído ambiente medido na calibração
  calibrated: boolean;
  minDurationMs: number;
  sessionSize: number; // palavras por missão
  level: Level;
  themeId: string;
  useTTS: boolean;
}

export type RecordingKind = 'cheer' | 'encourage' | 'word';

export interface Recording {
  id: string;
  kind: RecordingKind;
  wordId?: string;
  blob: Blob;
  createdAt: number;
}

export type AttemptMark = 'tentou' | 'acertou' | 'sem-voz';

export interface Attempt {
  id?: number;
  wordId: string;
  at: number;
  durationMs: number;
  syllables: number;
  mark: AttemptMark;
}
