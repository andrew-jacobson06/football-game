import dotenv from "dotenv";
import { existsSync } from "node:fs";
import {
  openDatabase,
  resolveDatabasePath,
  type DatabaseConnection,
} from "./connection.js";
import { migrateDatabase } from "./migrations.js";
dotenv.config();
let connection: DatabaseConnection | undefined;
/** Never create an empty database in place of the user's imported league. */
export function runtimeDatabase() {
  if (!connection) {
    const filename = resolveDatabasePath();
    if (!existsSync(filename))
      throw new Error(
        `SQLite database not found: ${filename}. Set DATABASE_PATH to your imported football.sqlite file.`,
      );
    const db = openDatabase({ filename });
    try {
      migrateDatabase(db);
      connection = db;
    } catch (error) {
      db.close();
      throw error;
    }
  }
  return connection;
}
export function closeRuntimeDatabase() {
  connection?.close();
  connection = undefined;
}
