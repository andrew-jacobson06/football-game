import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { DatabaseConnection } from "./connection.js";

export type Migration = { version: number; name: string; sql: string; checksum: string };
export function migration(version: number, name: string, source: string): Migration {
  // Git's CRLF checkout on Windows must not change an applied migration's checksum.
  const sql = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  return { version, name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
}
export function loadMigrations(directory = fileURLToPath(new URL("./migrations/", import.meta.url))): Migration[] {
  const result = readdirSync(directory).filter(name => name.endsWith(".sql")).map(name => {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(name);
    if (!match) throw new Error(`Invalid migration filename: ${name}`);
    return migration(Number(match[1]), name, readFileSync(path.join(directory, name), "utf8"));
  }).sort((a,b) => a.version-b.version);
  if (!result.length || result.some((item,index) => item.version !== index+1)) throw new Error("Migration versions must start at 0001 and be contiguous and unique.");
  return result;
}
export function migrationHistory(db: DatabaseConnection) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get()) return [];
  return db.prepare("SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version").all() as Array<{ version:number; name:string; checksum:string; applied_at:string }>;
}
export function verifyMigrationHistory(db: DatabaseConnection, migrations = loadMigrations()) {
  const history = migrationHistory(db);
  history.forEach((row,index) => {
    const expected = migrations[index];
    if (row.version !== index+1 || !expected || expected.version !== row.version) throw new Error("The database migration history is unknown or newer than this app. Use the matching app version.");
    if (row.name !== expected.name || row.checksum !== expected.checksum) throw new Error(`Migration ${row.version} has changed since it was applied. Restore its original file and create a new migration.`);
  });
  return history;
}
export function migrateDatabase(db: DatabaseConnection, migrations = loadMigrations()) {
  if (!migrations.length || migrations.some((item,index)=>item.version!==index+1)) throw new Error("Migration versions must start at 1 and be contiguous and unique.");
  if (db.inTransaction) throw new Error("Schema migration must own its transaction.");
  return db.transaction(() => {
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{name:string}>;
    if (existing.length && !existing.some(row=>row.name==="schema_migrations")) throw new Error("This database has tables but no Football Game migration history. Choose a new database path.");
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ) STRICT`);
    const history = verifyMigrationHistory(db,migrations);
    const applied: string[] = [];
    for (const item of migrations.slice(history.length)) {
      db.exec(item.sql);
      db.prepare("INSERT INTO schema_migrations(version,name,checksum) VALUES(?,?,?)").run(item.version,item.name,item.checksum);
      applied.push(item.name);
    }
    db.pragma(`user_version = ${migrations.length}`);
    return applied;
  }).immediate();
}
