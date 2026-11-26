import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface Props {
  holdMs: number;
  onHold: () => void;
  className?: string;
  label: string;
  children: ReactNode;
}

/**
 * Botão que só funciona segurando. Protege a área dos pais e a saída da
 * missão de toques acidentais da criança.
 */
export function HoldButton({ holdMs, onHold, className = '', label, children }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onHold();
    }, holdMs);
  };
  const cancel = () => {
    setHolding(false);
    window.clearTimeout(timer.current);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`hold ${holding ? 'hold--active' : ''} ${className}`}
      style={{ '--hold-ms': `${holdMs}ms` } as CSSProperties}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold__ring" />
      {children}
    </button>
  );
}
