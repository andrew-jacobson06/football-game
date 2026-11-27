# QB interception probability matrices

[Excel workbook](qb-interception-matrices.xlsx) • [Six matrices](MATRICES.md)

Uses the **latest rebalanced Read QB curves**, the existing Ball Hawk polynomial, uploaded player ratings, user-updated accuracy multipliers, and the existing normalized QB accuracy model. These are exact analytic probabilities, not Monte Carlo estimates or observed season interception rates.

- Separate top-40 means across all 107 players: **Read QB 77.8**, **Ball Hawk 77.25**. The top lists are in inputs.json and the workbook; this is a hypothetical defender at those averages, not an average of nonlinear risks from 40 individual defenders.
- All 12 players with offense position QB are included. Rows are sorted by accuracy descending; equal-accuracy QBs have equal risk under these assumptions.
- Actual openness bands are 0–39, 40–49, 50–59, 60–69, 70–79, 80–89 and 90+. The first group shares the Erased polynomial; 90+ has zero route-jump chance but still permits the poor-incompletion interception path.
- The six completion assumptions are **75%, 70%, 65%, 60%, 55%, 50%**. Each is the completion probability **after a route jump fails**, held identical across the five throw-quality types for that scenario. It is not final observed completion percentage, which will be lower when jumps cause interceptions/deflections. Actual gameplay completion also depends on depth, receiver traits, exact openness, quality adjustments and jump effects; those are deliberately represented here by the specified fixed conditional completion chance.
- Perfect and Accurate incompletions cannot enter the second interception path. Both qualities can still be intercepted through the initial route-jump path.
- Both accuracy multiplier tables now use Perfect **.25**, Accurate **.75**, Close **1**, Catchable **1.2**, Off Target **1.6**. These are the user-provided replacements; they supersede the original workbook values for this analysis.

For each QB and quality type `t`, let `w_t` be its normalized probability from `getThrowTypeChances`, `J_t` the clamped jump probability, `K_t` the clamped pick probability after the accuracy multiplier, and `H = clamp((77.25/12)^2,0,100)/100 = 0.4144140625`. For conditional completion probability `C`:

```text
P(pick) = sum_t w_t × [J_t × K_t
                       + (1 − J_t) × (1 − C) × H × K_t × eligible_t]
```

`eligible_t` is 1 only for Close, Catchable and Off Target. The `(1 − J_t)` term prevents double-counting: a successful route jump resolves immediately as either a pick or a deflection. It never reaches the secondary check.

CSV cells are in **percentage points** (e.g. 0.82 means 0.82%). Excel cells use fraction values with percentage formatting. Every workbook/CSV cell was checked against the full-precision results.json. The workbook includes throw-quality distributions and the defender top-40 source values.

From `apps/api`, regenerate analytic JSON and CSVs using the actual engine functions:

```text
node --import tsx ../../docs/analysis/qb-pick-risk/calculate.mts
```

inputs.json identifies the immutable player-source workbook SHA-256 and records the later user-provided multiplier overrides separately. The script checks the revised model identity, normalized accuracy weights, probability bounds and zero route-jump risk at 90+. It does not change the game or either database.
