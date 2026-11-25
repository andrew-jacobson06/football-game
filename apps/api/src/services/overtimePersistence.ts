import { overtimeState } from "../../../web/src/components/league/overtime.js";
import type { LeagueGame } from "../../../web/src/components/league/types.js";
export function overtimeWrites(headers: string[], rowIndex: number, value: unknown) {
  if (value === undefined) return [];
  const state = overtimeState({ Overtime: value as LeagueGame["Overtime"] });
  if (!state) throw new Error("Invalid overtime game state.");
  const index = headers.findIndex(h=>h.trim().toLowerCase()==="overtime");
  let number = (index < 0 ? headers.length : index) + 1, column = "";
  while(number>0){const digit=(number-1)%26;column=String.fromCharCode(65+digit)+column;number=Math.floor((number-1)/26);}
  return [
    ...(index < 0 ? [{range:`Games!${column}1`,values:[["Overtime"]]}] : []),
    {range:`Games!${column}${rowIndex+2}`,values:[[JSON.stringify(state)]]},
  ];
}
