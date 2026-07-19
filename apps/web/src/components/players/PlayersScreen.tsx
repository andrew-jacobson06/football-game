import { useEffect, useState } from "react";
import { getPlayers } from "../../api/client";
import { PlayerCard } from "./PlayerCard";
import { PlayerList } from "./PlayerList";
import type { Player } from "./types";

type PlayersScreenProps = {
  onBack?: () => void;
};

export function PlayersScreen({ onBack }: PlayersScreenProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const result = await getPlayers();
        setPlayers(result.players);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load players");
      } finally {
        setIsLoading(false);
      }
    }

    loadPlayers();
  }, []);

  if (selectedPlayer) {
    return (
      <PlayerCard
        player={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
      />
    );
  }

  return (
    <>
      {isLoading && <p className="players-message">Loading players...</p>}
      {error && (
        <p className="players-message players-message--error">{error}</p>
      )}
      {!isLoading && !error && (
        <PlayerList
          players={players}
          onSelectPlayer={setSelectedPlayer}
          onBack={onBack}
        />
      )}
    </>
  );
}
