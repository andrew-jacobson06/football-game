type StarsProps = {
  value: string | number | undefined;
};

export function Stars({ value }: StarsProps) {
  const numericValue = Number(value) || 0;
  const full = Math.floor(numericValue);
  const half = numericValue - full >= 0.5;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));

  return (
    <span className="stars" aria-label={`${numericValue} stars`}>
      {Array.from({ length: full }, (_, index) => (
        <span className="star full" key={`full-${index}`}>
          ★
        </span>
      ))}
      {half && <span className="star half">★</span>}
      {Array.from({ length: empty }, (_, index) => (
        <span className="star empty" key={`empty-${index}`}>
          ★
        </span>
      ))}
    </span>
  );
}
