import { useEffect, type CSSProperties } from "react";
export function TouchdownBanner({
  side,
  logo,
  abbreviation,
  primary,
  secondary,
  onDone,
}: {
  side: "Home" | "Away";
  logo: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div
      className={`touchdown-banner touchdown-banner--${side.toLowerCase()}`}
      style={
        {
          "--td-primary": primary || "var(--accent-red)",
          "--td-secondary": secondary || "var(--text-inverse)",
        } as CSSProperties
      }
      role="status"
      aria-label={`${abbreviation} TOUCHDOWN`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onDone();
      }}
    >
      <span className="touchdown-banner__logo">
        <span>{abbreviation}</span>
        {logo && (
          <img
            src={logo}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <strong>TOUCHDOWN</strong>
    </div>
  );
}
