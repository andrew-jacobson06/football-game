import type { CSSProperties } from "react";
import { playerImageUrl, playerJerseyUrl } from "./playerImageUrls";

type PlayerRecord = Record<string, unknown>;

export function PlayerImage({
  player,
  alt = "",
  className = "",
  fallback,
  style,
}: {
  player?: PlayerRecord;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  style?: CSSProperties;
}) {
  const image = playerImageUrl(player);
  const jersey = playerJerseyUrl(player);

  if (!image && !jersey) return fallback ?? null;

  return (
    <span className={`player-image-layers ${className}`.trim()} style={style}>
      {jersey && <img className="player-image-layer player-image-layer--jersey" src={jersey} alt="" />}
      {image && <img className="player-image-layer player-image-layer--player" src={image} alt={alt} />}
    </span>
  );
}
