import type { Player } from "./types";
import { Stars } from "./Stars";

const FALLBACK_PLAYER_IMAGE = "https://andrew-jacobson06.github.io/public-audio/baby.png";

const traitGroups: Record<string, Array<{ key: keyof Player; label: string }>> = {
  "General Traits": [
    { key: "Size", label: "Size" },
    { key: "Strength", label: "Strength" },
    { key: "Stamina", label: "Stamina" },
    { key: "Ball Security", label: "Ball Security" }
  ],
  "Passing Skills": [
    { key: "Poise", label: "Poise" },
    { key: "Accuracy", label: "Accuracy" },
    { key: "Arm-Strength", label: "Arm-Strength" },
    { key: "Read Defense", label: "Read Defense" }
  ],
  "Running Skill": [
    { key: "Acceleration", label: "Acceleration" },
    { key: "Speed", label: "Speed" },
    { key: "Juke", label: "Juke" },
    { key: "Vision", label: "Vision" }
  ],
  "Receiving Skill": [
    { key: "Route Running", label: "Route Running" },
    { key: "Jump", label: "Jump" },
    { key: "Hands", label: "Hands" }
  ],
  "Off Ball Skills": [
    { key: "Run Blocking", label: "Run Blocking" },
    { key: "Pass Protect", label: "Pass Protect" }
  ],
  "Defensive Skills": [
    { key: "RunStop", label: "RunStop" },
    { key: "PassRush", label: "PassRush" },
    { key: "Tackling", label: "Tackling" },
    { key: "Strip", label: "Strip" },
    { key: "Ball Hawk", label: "Ball Hawk" },
    { key: "Read QB", label: "Read QB" },
    { key: "Coverage", label: "Coverage" }
  ]
};

function getBarColor(val: number) {
  if (val <= 30) return "red";
  if (val <= 50) return "orange";
  if (val <= 70) return "yellow";
  if (val <= 90) return "light-green";
  return "dark-green";
}

function numberValue(value: string | number | undefined, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

type PlayerCardProps = {
  player: Player;
  onBack: () => void;
};

export function PlayerCard({ player, onBack }: PlayerCardProps) {
  return (
    <div id="playerCardView">
      <button id="playerCardBack" className="back-button" type="button" onClick={onBack}>← Back</button>
      <div className="player-card-layout">
        <div id="playerImageContainer" className="player-image-container">
          <img
            id="player-card-image"
            src={player.Image || FALLBACK_PLAYER_IMAGE}
            alt="Player"
            style={{
              transform: `translate(${numberValue(player.translateX)}px, ${numberValue(player.translateY)}px) scale(${numberValue(player.scale, 1)})`
            }}
          />
          <div id="jersey-wrapper">
            {player.jersey && <img id="jersey" src={player.jersey} alt="Jersey Overlay" />}
          </div>
        </div>
        <div id="playerDetails" className="player-details">
          <div><strong>{player.Name}</strong></div>
          <div>{player.Team}</div>
          <div>{player.Pos} / {player.DefPos}</div>
          <div>Off: <Stars value={player["Off Stars"]} /></div>
          <div>Def: <Stars value={player["Def Stars"]} /></div>
        </div>
        <div id="playerTraitBars" className="player-trait-bars">
          {Object.entries(traitGroups).map(([groupName, traits]) => (
            <details className="trait-group" open key={groupName}>
              <summary>{groupName}</summary>
              {traits.map((trait) => {
                const val = numberValue(player[trait.key] as string | number | undefined);
                return (
                  <div className="trait-bar-card" key={trait.label}>
                    <div className="trait-bar-header">
                      <span className="trait-name">{trait.label}</span>
                      <span className="trait-value">{val}</span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${getBarColor(val)}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
