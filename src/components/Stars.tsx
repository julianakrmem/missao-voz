/** Chuva de estrelas para comemorar. Posições fixas por índice para não "pular" a cada render. */
export function Stars({ count = 14 }: { count?: number }) {
  return (
    <div className="stars" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="stars__item"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 7) * 0.12}s`,
            fontSize: `${2 + (i % 3)}rem`,
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}
