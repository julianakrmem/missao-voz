import { useEffect, useState, type CSSProperties } from 'react';
import { detector } from './audio/VoiceDetector';
import { loadSettings, saveSettings } from './storage/db';
import { getTheme } from './themes';
import { Home } from './screens/Home';
import { Mission } from './screens/Mission';
import { Done } from './screens/Done';
import { ParentPanel } from './screens/ParentPanel';
import type { Settings } from './types';

type Screen = { name: 'home' } | { name: 'mission'; run: number } | { name: 'done'; words: number } | { name: 'panel' };

function applyToDetector(s: Settings) {
  detector.sensitivity = s.sensitivity;
  detector.noiseFloor = s.noiseFloor;
  detector.minDurationMs = s.minDurationMs;
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    loadSettings().then((s) => {
      applyToDetector(s);
      setSettings(s);
    });
  }, []);

  if (!settings) return null;
  const theme = getTheme(settings.themeId);

  const updateSettings = (s: Settings) => {
    applyToDetector(s);
    setSettings(s);
    saveSettings(s);
  };

  const play = async () => {
    await detector.start(); // precisa acontecer dentro do toque (regra dos navegadores)
    if (!settings.calibrated) {
      const noiseFloor = await detector.calibrate(1000);
      updateSettings({ ...settings, noiseFloor, calibrated: true });
    }
    setScreen({ name: 'mission', run: Date.now() });
  };

  const style = {
    '--bg': theme.colors.bg,
    '--bg-accent': theme.colors.bgAccent,
    '--primary': theme.colors.primary,
    '--power': theme.colors.power,
    '--text': theme.colors.text,
  } as CSSProperties;

  return (
    <div className="app" style={style}>
      {screen.name === 'home' && <Home theme={theme} onPlay={play} onParent={() => setScreen({ name: 'panel' })} />}
      {screen.name === 'mission' && (
        <Mission
          key={screen.run}
          settings={settings}
          theme={theme}
          onExit={() => setScreen({ name: 'home' })}
          onDone={(words) => setScreen({ name: 'done', words })}
        />
      )}
      {screen.name === 'done' && <Done theme={theme} words={screen.words} onHome={() => setScreen({ name: 'home' })} />}
      {screen.name === 'panel' && (
        <ParentPanel settings={settings} onChange={updateSettings} onClose={() => setScreen({ name: 'home' })} />
      )}
    </div>
  );
}
