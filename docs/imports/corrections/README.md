# Season 1 roster correction

`season-1-roster.sql` applies the user's explicit reviewed list of 107 players: 89 assigned to teams and 18 unassigned. This is an optional manual data correction, not an application migration. Pulling the branch does not change any local roster.

1. Stop the API with Ctrl+C. Back up the populated database using `npm run db:backup -- --output "C:/Backups/football-before-roster.sqlite"` in `apps/api` (with DATABASE_PATH already pointing to your actual database).
2. Open that same populated database in DB Browser and save any pending edits with **Write Changes**.
3. Open **Execute SQL**, then **Open SQL file** and select `docs/imports/corrections/season-1-roster.sql` from the checked-out repository.
4. Execute the **entire file** using Execute All / F5, with no selected text. It validates the season, player names and team abbreviations before making changes. Do not run isolated fragments.
5. Confirm execution succeeds and inspect the final Player / Team / Team_Name result. Blank team entries from the supplied list display as `UNASSIGNED` and are stored as SQL NULL team IDs.
6. Click **Write Changes**, then **Close Database** to release the write lock. Restart the API and refresh the browser.

The script only changes current/future active assignments for listed players in Season 1 when a correction is needed. Existing incorrect assignments remain as cancelled records; `audit_log` stores their previous values and the new assignments. Historical completed assignment intervals, planned assignments, player identities/ratings, games, play participants, per-game statistics, playoff seedings and other seasons are unchanged. This repairs roster data; it does not pretend the old incorrect roster was a real historical trade.

An identical rerun creates no assignments or audit records. Unknown/ambiguous players, missing teams or failed verification roll back the correction. If an error occurs, stop and inspect it before retrying. The savepoint works inside DB Browser's edit transaction; there are no PRAGMA assignments that would implicitly commit it.

Tests: `python -m unittest discover -s docs/imports/corrections -p 'test_*.py' -v` from the repository root. They use disposable databases and the checked-in imports, not your live database.
