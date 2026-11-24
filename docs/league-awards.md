# League awards

The API reads both sections of the `Awards` sheet. Keep the columns:

- Candidate, Award, 1, 2, 3, 4, 5, 6, 7, 8, Total.
- Position, Side, Division, Player Name below FIRST TEAMS.

Keep eight MVP rows, five OPOY rows, and five DPOY rows. First-team rows define the displayed positions, including repeated RB, Blocker and ANY slots. Team and position metadata comes from Players, current PlayerTeams assignments and Teams. Season production comes from PlayerStats; regular-season Games supplies team results.

Set these variables in **apps/api/.env**, then restart the API:

```dotenv
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_AWARDS_MODEL=gemini-2.5-flash
```

The model setting is optional. Use a model available to your key. The key stays on the server; do not commit it. Free-tier availability and quotas depend on Google's current plan and your account. No API calls are made just by viewing nominees.

Advancing after all 13 weeks are complete asks Gemini to select nominees and every first-team slot. OPOY excludes quarterbacks. Blocker honors use blocking regardless of position; ANY honors recognize defensive contributors. Names must match roster players; first-team selections must match division and position (except Blocker and ANY). A player may earn honors on both sides, but cannot occupy two slots on the same side within a division.

The API validates the complete response before atomically writing candidate names, first-team names, zeroed place-vote counts, playoff seeds and the new season week. A failed AI request or invalid selection leaves the season unchanged. Awards pages remain visible but empty during the regular season.

**Run vote** requests 125 ranked ballots from Gemini, in five batches of 25. Every ballot must rank every nominee exactly once. The API writes the aggregate first-through-eighth-place counts into C:J. Unused places for five-candidate awards remain zero. The API never overwrites K: **keep your Total formulas in that column**. After writing, the API reads the calculated Total values and ranks candidates by:

1. Total points descending.
2. First-place votes, then second-place votes, continuing through last place.

If all these values tie, the page reports a tie instead of inventing a winner. The UI displays points, place-vote counts, and the winner after 125 ballots. Existing votes disable reruns; to deliberately rerun an award, clear only its C:J vote cells in the sheet first. Other awards and first teams remain unchanged.

Requests are serialized within one API process. Run a single API instance for this workbook. Concurrent manual sheet edits detected during generation cancel the write rather than overwrite those edits. Gemini may take several minutes; the UI shows a voting state. Tests use a mocked model; a configured local key and sheet are required for a live run.
