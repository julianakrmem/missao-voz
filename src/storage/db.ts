import { DEFAULT_THEME_ID } from '../themes';
import type { Attempt, Recording, RecordingKind, Settings } from '../types';

// IndexedDB sem dependências. Tudo fica no aparelho (privacidade da criança).
const DB_NAME = 'missao-voz';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('recordings', { keyPath: 'id' });
        db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('settings');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 6,
  noiseFloor: 0.008,
  calibrated: false,
  minDurationMs: 250,
  sessionSize: 4,
  level: 1,
  themeId: DEFAULT_THEME_ID,
  useTTS: true,
};

export async function loadSettings(): Promise<Settings> {
  const saved = await run<Partial<Settings> | undefined>('settings', 'readonly', (s) => s.get('main'));
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: Settings): Promise<unknown> {
  return run('settings', 'readwrite', (s) => s.put(settings, 'main'));
}

export function addRecording(rec: Recording): Promise<unknown> {
  return run('recordings', 'readwrite', (s) => s.put(rec));
}

export async function listRecordings(kind?: RecordingKind): Promise<Recording[]> {
  const all = await run<Recording[]>('recordings', 'readonly', (s) => s.getAll());
  return (kind ? all.filter((r) => r.kind === kind) : all).sort((a, b) => a.createdAt - b.createdAt);
}

export function deleteRecording(id: string): Promise<unknown> {
  return run('recordings', 'readwrite', (s) => s.delete(id));
}

export function addAttempt(attempt: Attempt): Promise<number> {
  return run<number>('attempts', 'readwrite', (s) => s.add(attempt));
}

export async function markAttempt(id: number, mark: Attempt['mark']): Promise<void> {
  const attempt = await run<Attempt | undefined>('attempts', 'readonly', (s) => s.get(id));
  if (attempt) await run('attempts', 'readwrite', (s) => s.put({ ...attempt, mark }));
}

export function listAttempts(): Promise<Attempt[]> {
  return run<Attempt[]>('attempts', 'readonly', (s) => s.getAll());
}

export function clearAttempts(): Promise<unknown> {
  return run('attempts', 'readwrite', (s) => s.clear());
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
