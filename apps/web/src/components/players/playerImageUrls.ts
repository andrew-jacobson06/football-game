type PlayerRecord = Record<string, unknown>;

const value = (player: PlayerRecord | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const candidate = String(player?.[key] ?? "").trim();
    if (candidate) return candidate;
  }
  return "";
};

export const playerImageUrl = (player?: PlayerRecord) =>
  value(player, "image", "Image", "photo", "Photo", "Player Image from AI", "player image from ai");

export const playerJerseyUrl = (player?: PlayerRecord) =>
  value(player, "jersey", "Jersey", "Jersey Image", "jersey image");
