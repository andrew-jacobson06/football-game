import { mkdirSync, openSync, closeSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openDatabase, type DatabaseConnection } from "./connection.js";
import { loadMigrations, migrationHistory, verifyMigrationHistory } from "./migrations.js";

export function checkDatabase(db: DatabaseConnection) {
  const quick = db.pragma("quick_check") as Array<{quick_check:string}>;
  const foreignKeys = db.pragma("foreign_key_check");
  if (quick.length !== 1 || quick[0].quick_check !== "ok" || (foreignKeys as unknown[]).length) throw new Error("Database integrity or foreign-key check failed.");
  return { integrity: "ok", foreignKeyViolations: 0 };
}
export function databaseStatus(db: DatabaseConnection) {
  const migrations = loadMigrations();
  const history = verifyMigrationHistory(db,migrations);
  if (!history.length) throw new Error("This file has not been initialized as a Football Game database.");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{name:string}>;
  return { filename: db.name, sqliteVersion: db.prepare("SELECT sqlite_version() AS version").get(),
    schemaVersion: history.at(-1)!.version, pendingMigrations: migrations.slice(history.length).map(item=>item.name),
    journalMode: db.pragma("journal_mode", {simple:true}), foreignKeys: db.pragma("foreign_keys", {simple:true}),
    tables: tables.map(({name})=>({name,rows:(db.prepare(`SELECT count(*) AS n FROM "${name.replaceAll('"','""')}"`).get() as {n:number}).n})) };
}
function reserveFile(filename: string) {
  mkdirSync(path.dirname(filename), {recursive:true,mode:0o700});
  closeSync(openSync(filename,"wx",0o600));
}
export async function backupDatabase(db: DatabaseConnection, destination?: string) {
  if (db.inTransaction) throw new Error("Finish the current transaction before taking a backup.");
  verifyMigrationHistory(db);
  if (!migrationHistory(db).length) throw new Error("Only initialized Football Game databases can be backed up with this command.");
  const filename = path.resolve(destination ?? path.join(path.dirname(db.name),"backups",`${path.basename(db.name)}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.sqlite`));
  if (path.resolve(db.name)===filename) throw new Error("The backup must be a separate file.");
  if ([`${filename}-wal`,`${filename}-shm`,`${filename}-journal`].some(existsSync)) throw new Error("Choose a backup path without existing journal files.");
  reserveFile(filename); // Never replace an existing file, including a previous backup.
  try {
    await db.backup(filename);
    const restored = openDatabase({filename,readonly:true});
    try { checkDatabase(restored); verifyMigrationHistory(restored); } finally { restored.close(); }
    return filename;
  } catch(error) { rmSync(filename,{force:true}); throw error; }
}
/** Restore to a new path; the operator chooses when to switch the running app to it. */
export async function restoreDatabase(source: string, destination: string) {
  const from=path.resolve(source), to=path.resolve(destination);
  if (from===to || existsSync(to) || existsSync(`${to}-wal`) || existsSync(`${to}-shm`) || existsSync(`${to}-journal`)) throw new Error("Restore requires a new destination path, with no existing database or journal files.");
  const backup=openDatabase({filename:from,readonly:true});
  try {
    checkDatabase(backup);
    // SQLite's backup API includes any WAL state instead of copying only the main file.
    return await backupDatabase(backup,to);
  } finally { backup.close(); }
}
