import type { Theme } from '../types';
import defaultTheme from './default/theme';

/**
 * Temas locais: qualquer pasta em src/themes/local/<nome>/theme.tsx é
 * carregada automaticamente. Essa pasta está no .gitignore, então
 * personagens com direitos autorais ficam só no seu aparelho.
 */
const localModules = import.meta.glob<{ default: Theme }>('./local/*/theme.tsx', { eager: true });

export const THEMES: Theme[] = [defaultTheme, ...Object.values(localModules).map((m) => m.default)];

/** Se existir um tema local, ele vira o padrão no aparelho. */
export const DEFAULT_THEME_ID = THEMES[THEMES.length - 1].id;

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? defaultTheme;
}
