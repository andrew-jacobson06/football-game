import type { Player } from "./types";
import { Stars } from "./Stars";

type PlayerListProps = {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
};

export function PlayerList({ players, onSelectPlayer }: PlayerListProps) {
  return (
    <div id="playerListView">
      <button id="playerListBack" className="back-button" type="button">← Back</button>
      <table id="playerTable" className="player-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Positions</th>
            <th>Stars</th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={`${player.Name ?? "player"}-${index}`} onClick={() => onSelectPlayer(player)}>
              <td>{player.Name}</td>
              <td>{player.Pos}/{player.DefPos}</td>
              <td>
                O:<Stars value={player["Off Stars"]} /> D:<Stars value={player["Def Stars"]} />
              </td>
              <td>{player.Team}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
