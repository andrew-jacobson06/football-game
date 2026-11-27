import dotenv from "dotenv";
import { createApp } from "./app.js";
import { repository } from "./db/leagueRepository.js";
import { resolveDatabasePath } from "./db/connection.js";
dotenv.config();
const repo = repository();
const season = repo.season();
repo.settingsVersion();
const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => {
  console.log(`Football game API running on http://localhost:${port}`);
  console.log(
    `SQLite: ${resolveDatabasePath()} | ${season.display_name} (${season.id})`,
  );
});
