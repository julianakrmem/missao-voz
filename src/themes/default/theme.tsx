import type { HeroMood, Theme } from '../../types';

// Tema padrão, 100% original e livre de direitos autorais:
// a Heroína/Herói Estelar lança um raio de estrelas que arruma as Nuvens Bagunceiras.

function Hero({ mood }: { mood: HeroMood }) {
  const mouth = {
    idle: 'M88 92 Q100 100 112 92',
    listening: 'M95 92 Q100 100 105 92 Q100 86 95 92',
    firing: 'M90 90 Q100 104 110 90 Z',
    happy: 'M84 88 Q100 108 116 88 Z',
    encourage: 'M86 92 Q100 102 114 92',
  }[mood];
  const armUp = mood === 'firing' || mood === 'happy';
  return (
    <svg viewBox="0 0 200 240" className={`hero hero--${mood}`} aria-hidden>
      <path d="M62 120 Q40 200 48 220 L152 220 Q160 200 138 120 Z" fill="#ff8a3d" />
      <rect x="78" y="196" width="18" height="34" rx="9" fill="#1f8f83" />
      <rect x="104" y="196" width="18" height="34" rx="9" fill="#1f8f83" />
      <rect x="60" y="112" width="80" height="94" rx="34" fill="#2bb3a3" />
      <polygon
        points="100,132 106,148 123,148 109,158 114,174 100,164 86,174 91,158 77,148 94,148"
        fill="#ffd84d"
      />
      <rect x="40" y="128" width="22" height="56" rx="11" fill="#2bb3a3" transform="rotate(14 51 132)" />
      <g className="hero__arm" transform={armUp ? 'rotate(-125 148 132)' : 'rotate(-14 148 132)'}>
        <rect x="138" y="128" width="22" height="56" rx="11" fill="#2bb3a3" />
        <circle cx="149" cy="186" r="12" fill="#ffd84d" />
      </g>
      <line x1="100" y1="30" x2="100" y2="12" stroke="#c9d3ee" strokeWidth="5" strokeLinecap="round" />
      <polygon points="100,0 104,9 113,9 106,14 108,23 100,18 92,23 94,14 87,9 96,9" fill="#ffd84d" />
      <circle cx="100" cy="76" r="50" fill="#f4f7ff" stroke="#c9d3ee" strokeWidth="4" />
      <ellipse cx="100" cy="80" rx="36" ry="28" fill="#2c3e78" />
      <ellipse cx="86" cy="76" rx="7" ry={mood === 'happy' ? 3 : 9} fill="#fff" />
      <ellipse cx="114" cy="76" rx="7" ry={mood === 'happy' ? 3 : 9} fill="#fff" />
      <path d={mouth} fill={mood === 'firing' || mood === 'happy' ? '#ff9db3' : 'none'} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="78" cy="62" rx="10" ry="5" fill="#ffffff55" transform="rotate(-25 78 62)" />
    </svg>
  );
}

function Target({ caught }: { caught: boolean }) {
  return (
    <svg viewBox="0 0 220 180" className={`target ${caught ? 'target--caught' : ''}`} aria-hidden>
      {caught && (
        <g strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M30 170 Q110 60 190 170" stroke="#ff6b6b" />
          <path d="M44 170 Q110 78 176 170" stroke="#ffd84d" />
          <path d="M58 170 Q110 96 162 170" stroke="#5ad17a" />
          <path d="M72 170 Q110 114 148 170" stroke="#4dabff" />
        </g>
      )}
      <g fill={caught ? '#ffffff' : '#9aa3b5'}>
        <circle cx="70" cy="90" r="38" />
        <circle cx="115" cy="68" r="46" />
        <circle cx="158" cy="92" r="36" />
        <rect x="48" y="90" width="132" height="40" rx="20" />
      </g>
      {caught ? (
        <>
          <path d="M84 88 Q92 80 100 88" stroke="#2c3e78" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M124 88 Q132 80 140 88" stroke="#2c3e78" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M96 104 Q112 120 128 104" stroke="#2c3e78" strokeWidth="5" fill="#ff9db3" strokeLinecap="round" />
          <circle cx="80" cy="104" r="7" fill="#ffb3c4" />
          <circle cx="144" cy="104" r="7" fill="#ffb3c4" />
        </>
      ) : (
        <>
          <path d="M82 78 L100 86" stroke="#4a5266" strokeWidth="5" strokeLinecap="round" />
          <path d="M142 78 L124 86" stroke="#4a5266" strokeWidth="5" strokeLinecap="round" />
          <circle cx="92" cy="94" r="6" fill="#4a5266" />
          <circle cx="132" cy="94" r="6" fill="#4a5266" />
          <path d="M100 114 Q112 106 124 114" stroke="#4a5266" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const theme: Theme = {
  id: 'heroi-estelar',
  name: 'Herói Estelar',
  colors: {
    bg: '#1d2b5c',
    bgAccent: '#3a4f9a',
    primary: '#2bb3a3',
    power: '#ffd84d',
    text: '#ffffff',
  },
  powerWord: 'Zuum!',
  fallbackCheers: ['Isso mesmo!', 'Uau, que poder!', 'Muito bem!', 'Você conseguiu!'],
  fallbackEncourage: ['Vamos juntos de novo?', 'Mais uma vez, bem forte!'],
  extraWords: [{ id: 'estrela-zum', text: 'Zuum!', emoji: '⭐', level: 1, syllables: 1 }],
  Hero,
  Target,
};

export default theme;
