import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, resolveDatabasePath } from "./connection.js";
import { loadMigrations, verifyMigrationHistory, migrateDatabase } from "./migrations.js";
import { backupDatabase, checkDatabase, databaseStatus, restoreDatabase } from "./management.js";

dotenv.config({path:fileURLToPath(new URL("../../.env",import.meta.url)),quiet:true});
async function main() {
  const [command,...args]=process.argv.slice(2);
  const options:Record<string,string>={};
  for(let i=0;i<args.length;i+=2){
    if(!["--path","--output","--from","--to"].includes(args[i]) || !args[i+1] || args[i+1].startsWith("--") || options[args[i]]!==undefined) throw new Error("Use --path FILE, --output FILE, or --from BACKUP --to NEW_FILE.");
    options[args[i]]=args[i+1];
  }
  const allowed:Record<string,string[]>={init:["--path"],migrate:["--path"],status:["--path"],check:["--path"],backup:["--path","--output"],restore:["--from","--to"]};
  if(!allowed[command] || Object.keys(options).some(key=>!allowed[command].includes(key))) throw new Error("Choose init, migrate, status, check, backup or restore with its documented options.");
  if(command==="restore"){
    if(!options["--from"]||!options["--to"]) throw new Error("Restore requires --from BACKUP --to NEW_FILE.");
    console.log(JSON.stringify({restoredTo:await restoreDatabase(options["--from"],options["--to"]),note:"Set DATABASE_PATH to this file after reviewing it."},null,2));return;
  }
  if(options["--path"]===":memory:") throw new Error("Management commands require a persistent file.");
  const filename=options["--path"]?path.resolve(options["--path"]):resolveDatabasePath();
  if(filename===":memory:") throw new Error("Management commands require a persistent file; DATABASE_PATH cannot be :memory:.");
  const writable=command==="init"||command==="migrate";
  if(command==="migrate"&&!existsSync(filename)) throw new Error("Database not found. Run npm run db:init first.");
  const db=openDatabase({filename,readonly:!writable});
  try {
    if(writable){
      const hadTables=(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get() as {n:number}).n>0;
      const history=hadTables?verifyMigrationHistory(db):[];
      const beforeUpgradeBackup=hadTables && history.length<loadMigrations().length ? await backupDatabase(db) : null;
      const applied=migrateDatabase(db);
      console.log(JSON.stringify({applied,beforeUpgradeBackup,...databaseStatus(db),note:"Schema commands do not import spreadsheet data or switch the app storage provider."},null,2));
    } else if(command==="status") console.log(JSON.stringify(databaseStatus(db),null,2));
    else if(command==="check"){databaseStatus(db);console.log(JSON.stringify(checkDatabase(db),null,2));}
    else console.log(JSON.stringify({backup:await backupDatabase(db,options["--output"])},null,2));
  } finally { db.close(); }
}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"Database command failed.");process.exitCode=1;});
