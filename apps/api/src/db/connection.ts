import Database from "better-sqlite3";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type DatabaseConnection = Database.Database;
export function resolveDatabasePath(options: {
  databasePath?: string; platform?: NodeJS.Platform; homeDirectory?: string;
  localAppData?: string; dataHome?: string;
} = {}) {
  const platform = options.platform ?? process.platform;
  const paths = platform === "win32" ? path.win32 : path.posix;
  const supplied = (options.databasePath ?? process.env.DATABASE_PATH)?.trim();
  if (supplied) return supplied === ":memory:" ? supplied : paths.resolve(supplied);
  const home = options.homeDirectory ?? homedir();
  const directory = platform === "win32"
    ? options.localAppData ?? process.env.LOCALAPPDATA ?? paths.join(home, "AppData", "Local")
    : options.dataHome ?? process.env.XDG_DATA_HOME ?? paths.join(home, ".local", "share");
  return paths.join(directory, "FootballGame", "data", "football.sqlite");
}

/** No Google dependency, implicit schema upgrades or global connection side effects. */
export function openDatabase(options: { filename?: string; readonly?: boolean } = {}): DatabaseConnection {
  const filename = options.filename ?? resolveDatabasePath();
  const memory = filename === ":memory:";
  const existed = !memory && existsSync(filename);
  if (options.readonly && !existed) throw new Error(`Database not found: ${filename}. Run npm run db:init first.`);
  if (!options.readonly && !memory) mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new Database(filename, { readonly: options.readonly ?? false, fileMustExist: options.readonly ?? false, timeout: 5000 });
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    if (!options.readonly) {
      if (!memory && db.pragma("journal_mode = WAL", { simple: true }) !== "wal") throw new Error("SQLite could not enable WAL mode.");
      db.pragma("synchronous = FULL");
      if (!memory && !existed && process.platform !== "win32") chmodSync(filename, 0o600);
    }
    return db;
  } catch (error) { db.close(); throw error; }
}
