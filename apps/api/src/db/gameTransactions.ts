import type { DatabaseConnection } from "./connection.js";
export class StaleGameStateError extends Error {}
/** Synchronous primitive for the future SQLite save service; not wired to current Sheets routes. */
export function commitPlay<T>(db: DatabaseConnection, request: {gameId:string;playId:string;expectedVersion:number}, write: (db:DatabaseConnection,nextVersion:number)=>T) {
  if (!request.gameId || !request.playId || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion<0) throw new Error("A game ID, play ID and nonnegative state version are required.");
  if (db.inTransaction) throw new Error("Play commits must own their transaction.");
  return db.transaction(() => {
    const prior=db.prepare("SELECT game_id FROM plays WHERE id=?").get(request.playId) as {game_id:string}|undefined;
    const state=db.prepare("SELECT s.version,g.status FROM game_state s JOIN games g ON g.id=s.game_id WHERE s.game_id=?").get(request.gameId) as {version:number;status:string}|undefined;
    if (!state) throw new Error("Game state not found.");
    if (prior) {
      if (prior.game_id!==request.gameId) throw new Error("This play ID belongs to another game.");
      return {duplicate:true as const,version:state.version};
    }
    if (state.status==="final") throw new Error("A final game cannot accept another play.");
    const changed=db.prepare("UPDATE game_state SET version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE game_id=? AND version=?").run(request.gameId,request.expectedVersion);
    if (!changed.changes) throw new StaleGameStateError("Game state changed. Reload it before submitting another play.");
    const result=write(db,request.expectedVersion+1);
    if (result && typeof (result as {then?:unknown}).then==="function") throw new Error("Play transaction callbacks must be synchronous.");
    const play=db.prepare("SELECT game_id FROM plays WHERE id=?").get(request.playId) as {game_id:string}|undefined;
    const after=db.prepare("SELECT version FROM game_state WHERE game_id=?").get(request.gameId) as {version:number}|undefined;
    if (play?.game_id!==request.gameId || after?.version!==request.expectedVersion+1) throw new Error("The play commit did not insert its play or preserve the expected state version.");
    db.prepare("UPDATE game_state SET last_play_id=? WHERE game_id=?").run(request.playId,request.gameId);
    return {duplicate:false as const,version:after.version,result};
  }).immediate();
}
