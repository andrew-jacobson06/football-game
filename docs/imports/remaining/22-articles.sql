-- 22-articles. Reviewed uploaded workbook only; save pending edits and back up first.
-- Run ENTIRE file in DB Browser, verify counts, then Write Changes.
-- SAVEPOINT supports an existing transaction. No records are replaced.
-- 19 articles; exact IDs, Markdown including img tags, and publication timestamps retained.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_remaining_22;
CREATE TEMP TABLE afl_remaining_22_0 AS SELECT id, season_id, game_id, stage, regular_week, article_type, status, title, summary, markdown, published_at, is_featured, hero_image_url FROM articles WHERE 0;
INSERT INTO afl_remaining_22_0 (id, season_id, game_id, stage, regular_week, article_type, status, title, summary, markdown, published_at, is_featured, hero_image_url) VALUES
('2026-w01-g1-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'b1803c9c-56a6-5405-9c91-1459d2b56754', 'regular', 1, 'game_recap', 'published', 'Ezekiel Erupts for 301 Yards, Three Touchdowns as Portland Wildfire Hold Off Charlotte Kingsmen, 18–12', NULL, 'Portland needed only two offensive snaps to establish what Charlotte would spend the rest of the night trying unsuccessfully to contain.

After gaining 4 yards on the first play of the season, Ezekiel broke through the Kingsmen defense for a 71-yard touchdown. By halftime, he had done it again from the same distance. By the end of the night, Portland''s featured runner had piled up **301 yards and three touchdowns on 33 carries**, powering the Wildfire to an **18–12 season-opening victory** over Charlotte.

The final margin suggested a game that tightened considerably after halftime, and it did. Charlotte recovered from an 18–3 deficit, held Portland scoreless over the final two quarters and reached the end zone on fourth down to make it a one-score game entering the fourth quarter.

But the damage from Portland''s explosive first half was too substantial to erase.

The Wildfire finished with **352 rushing yards on 47 carries**, with Ezekiel accounting for more than 85 percent of that production. Charlotte generated **250 yards on 50 carries** and received 159 yards and a touchdown from T''Challa, but the Kingsmen never produced the kind of field-flipping play that Portland repeatedly received from its star runner.

For both clubs, the game represented a clean start to the season with no prior record or standing separating them. It was also a non-divisional opener, making Portland''s performance less about an immediate division advantage than about establishing an offensive identity.

That identity took all of 44 seconds to appear.

Portland opened at its own 25. Ezekiel gained 4 yards on first down, then took the next carry 71 yards for a touchdown with **14:16 remaining in the first quarter**. Charlotte had barely settled into the game before it was chasing a 6–0 deficit.

The Kingsmen responded methodically rather than explosively. T''Challa and Tweety moved Charlotte deep into Portland territory, but the Wildfire stiffened near the goal line. On third-and-8 from the 9, Tigger gained only 4 yards, forcing Charlotte to settle for a field goal with five seconds left in the quarter.

That made it 6–3 and appeared to restore some balance.

Portland erased that feeling almost immediately.

After opening the second quarter with a 2-yard Hippo run and a 2-yard Ezekiel gain, the Wildfire faced **third-and-6 from their own 29**. Ezekiel broke loose again. Seventy-one yards later, Portland had another touchdown and a 12–3 lead.

The symmetry was remarkable: two 71-yard touchdowns, both beginning from the Portland 29, both arriving before Charlotte could consistently force Ezekiel into the kind of short gains needed to make the Wildfire earn the field a few yards at a time.

Charlotte''s defense did produce disruption. Lil Slushie was particularly effective, recording **six tackles and four tackles for loss**, while Buzz added another stop behind the line. Portland was dropped for a loss five times overall.

The problem was what happened when Ezekiel escaped that initial penetration.

His third touchdown came late in the second quarter after Portland had driven deep into Charlotte territory. A 1-yard loss on first down and a modest 3-yard Ezekiel gain left the Wildfire facing third-and-8 from the Charlotte 13. Once again, Portland put the ball in Ezekiel''s hands. He covered all 13 yards for the score and pushed the lead to **18–3 with 3:10 left before halftime**.

Charlotte never stopped competing.

The Kingsmen opened the second half with another long possession. T''Challa helped move the offense into scoring range, but Portland again prevented a touchdown and forced Charlotte to kick on fourth-and-1. The field goal cut the margin to 18–6.

Charlotte''s defense then did what it had been unable to do consistently in the first half: prevent the catastrophic run. Portland never scored again.

That gave the Kingsmen a path back into the game.

Late in the third quarter, Charlotte drove inside the Portland 10. A 2-yard loss by T''Challa and a 9-yard Tweety run left the Kingsmen facing **fourth-and-3 from the 3** as the quarter ended. On the first snap of the fourth, Charlotte kept its offense on the field.

T''Challa gained exactly 3 yards and scored, cutting the deficit to **18–12**.

It was a fitting payoff for Charlotte''s primary offensive weapon. T''Challa finished with **159 yards on 32 carries**, producing 11 rushing first downs and a long gain of 20 yards. Tweety supplied 77 yards on 12 carries, including a 21-yard run, giving the Kingsmen 236 rushing yards from their top two backs.

The difference was explosiveness.

Portland recorded nine runs of at least 10 yards and two that reached 20, but those totals understate the damage because both of the longest plays traveled 71 yards. Ezekiel alone averaged **9.1 yards per carry**, meaning Charlotte could play sound defense for several snaps and still see an entire drive erased by one mistake.

Charlotte had chances because its defense kept the fourth quarter scoreless. But the Kingsmen were playing from behind because of what happened in the opening half, and Portland had accumulated enough cushion to survive without another point.

The Wildfire finished the opening week 1–0. Charlotte left 0–1, encouraged by a second-half response but facing an obvious defensive issue after allowing more than 350 rushing yards in its first game.

## Defining Play

Charlotte had just spent most of the first quarter recovering from Ezekiel''s opening 71-yard touchdown and finally cut the score to **6–3** with a field goal in the closing seconds.

Portland''s next possession therefore carried genuine importance. A sustained Charlotte stop could have changed the tone of the game.

Instead, the Wildfire faced **third-and-6 from their own 29 with 13:44 remaining in the second quarter**, handed the ball to Ezekiel and watched him break another 71-yard touchdown.

The play restored Portland''s nine-point advantage immediately and confirmed that the first long touchdown had not been an isolated breakdown. Charlotte could handle the Wildfire on individual snaps, but it had no answer once Ezekiel reached open space.

His later 13-yard touchdown created additional separation, but the second 71-yarder was the moment Portland demonstrated that its biggest advantage was repeatable.

## Offensive Player of the Game

**Ezekiel, Portland Wildfire**

There was no credible alternative.

Ezekiel carried **33 times for 301 yards and three touchdowns**, averaging 9.1 yards per attempt while producing scoring runs of **71, 71 and 13 yards**.

Portland''s other runners combined for only 51 yards. Big Boy was next with 21, while C Monster added 19. This was not a case of a dominant rushing system distributing production across an entire backfield. The Wildfire offense revolved around one runner repeatedly creating far more than the play required.

His explosiveness was also perfectly timed. The first 71-yard run established the game. The second came immediately after Charlotte had cut the margin to three. His third touchdown arrived on third-and-8 and gave Portland the 18 points it ultimately needed to survive Charlotte''s second-half comeback.

## Defensive Player of the Game

**C Monster, Portland Wildfire**

Charlotte successfully moved the football for significant stretches, so Portland''s defensive performance was less about total suppression than timely disruption.

C Monster supplied some of the Wildfire''s most important negative plays, finishing with **three tackles and two tackles for loss**. Portland recorded three tackles for loss as a team, meaning C Monster accounted for two-thirds of them.

That penetration mattered against a Charlotte offense built around keeping T''Challa moving forward and staying in manageable down-and-distance situations. The Kingsmen still generated 250 rushing yards, but Portland repeatedly tightened when Charlotte approached scoring territory, forcing two field goals before finally conceding a touchdown in the fourth quarter.

Big Boy''s 20 tackles reflected how often Charlotte successfully reached the second level, but C Monster''s ability to stop plays before they developed had greater strategic value in preserving Portland''s early lead.

## Summary

Portland opened its season **1–0 with an 18–12 victory** powered almost entirely by an extraordinary performance from Ezekiel, who rushed for **301 yards and three touchdowns on 33 carries**. Charlotte received 159 yards and a touchdown from T''Challa and held Portland scoreless in the second half, but two separate 71-yard Ezekiel touchdowns helped the Wildfire build an 18–3 advantage that proved too large to erase.', '2026-08-11T15:33:00Z', 1, NULL),
('2026-w01-g2-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '45d1a88a-3ab5-5b66-80f7-f1d2d265fecf', 'regular', 1, 'game_recap', 'published', 'Koala Runs for 264 Yards as Nashville Shock Overpower Columbus Talons, 21–6', NULL, 'Nashville''s first game of the season quickly became a demonstration of what happens when an opponent knows where the football is going and still cannot consistently stop it.

Koala carried **41 times for 264 yards and a touchdown**, Nashville rushed for **354 yards as a team**, and the Shock opened the year with a convincing **21–6 victory over the Columbus Talons**.

The result also gave Nashville an immediate divisional win. Both clubs entered the afternoon 0–0, so there was no existing standings hierarchy to upset, but the performance established a clear early contrast: Nashville consistently stayed ahead of the chains while Columbus spent much of the game fighting through negative plays.

The Shock ran 53 times for 354 yards, averaging 6.7 yards per carry. Columbus managed 176 yards on 42 attempts.

That **178-yard rushing advantage** told most of the story.

Nashville did not immediately turn its superiority into touchdowns. Its opening scoring possession stalled near the Columbus 10 after Mini was dropped for a 4-yard loss. Koala recovered 12 yards on third-and-13, but the Shock still faced fourth-and-1 and settled for a field goal with 9:48 remaining in the first quarter.

The 3–0 score understated how effectively Nashville was controlling the game.

Koala consistently churned out first downs, and the Shock''s secondary runners ensured Columbus could not focus exclusively on him. Mini finished with **70 yards on only five carries**, while Leon Gory added 21 yards and a touchdown on six attempts.

Nashville finally broke through for its first touchdown early in the second quarter.

Koala moved the offense across midfield and into Columbus territory before the Shock turned to Mini. With **14:21 remaining in the second quarter**, Mini took a second-and-9 carry from the Columbus 17 and scored.

The touchdown made it **9–0** and expanded the problem Columbus faced. Koala could punish the Talons through volume, but Nashville also had enough explosiveness elsewhere in the backfield to turn a crease into points.

The next Shock touchdown was more representative of the game''s broader pattern.

Nashville again leaned on Koala, who repeatedly generated manageable downs and converted third-down situations. With **7:35 remaining before halftime**, the Shock reached second-and-6 from the Columbus 10.

Koala finished the drive himself, scoring from 10 yards out to make it **15–0**.

By then Nashville had established control at the line of scrimmage. Koala would ultimately produce **15 rushing first downs** by himself. His longest run was 26 yards, meaning his 264-yard performance was not built around one or two statistical outliers. The Shock simply kept handing him the ball and receiving useful yardage.

Columbus'' offense had a much more difficult afternoon.

Black Dog led the Talons with **84 yards and a touchdown on 22 carries**, while EMC added 73 yards on 13 attempts. But Columbus surrendered **six tackles for loss**, making sustained drives considerably harder.

Nashville''s defense repeatedly created those problems before the Talons'' runners could reach the second level. Sloth and Ernie each recorded two tackles for loss, while Leon Gory and Jelly added one apiece.

That front-line disruption helped Nashville protect its halftime advantage even when Columbus generated occasional positive runs.

The Talons did not score until the fourth quarter.

Columbus finally assembled its best drive with the game already at 15–0. Black Dog gained 6 yards to set up a manageable third down, EMC converted with a 5-yard run, and Black Dog finished the possession from 4 yards out with **6:29 remaining**.

The touchdown cut the margin to **15–6** and gave Columbus a late opening.

Nashville answered by doing what it had done all game: giving the ball to Koala.

The Shock moved steadily back down the field, and Koala converted another first down with a 6-yard carry. With 1:31 remaining, Leon Gory scored from 5 yards out to produce the final **21–6** margin.

It was an appropriate conclusion. Nashville did not need trickery or a sudden change of identity to close the game. The Shock stayed with the rushing attack that had dictated the afternoon from the opening quarter.

Koala''s 41 carries were the clearest indication of that commitment.

Columbus had defensive successes. Doodle recorded two tackles for loss, EMC had a tackle for loss while also carrying a significant offensive workload, and Carl added another stop behind the line. The Talons dropped Nashville runners for losses four times.

The problem was that those negative plays rarely became extended stops. Koala''s volume and efficiency repeatedly repaired the damage.

Nashville produced **19 rushing first downs** and 14 runs of at least 10 yards. Columbus had 12 rushing first downs and only two gains of at least 10 yards.

The difference was not simply that the Shock ran for more yards. It was that Nashville created explosive gains while also possessing the consistency required to keep drives alive.

For an opening-week divisional game, that was a significant first statement.

## Defining Play

Nashville led 9–0 midway through the second quarter, but Columbus was still within range of one productive possession changing the game.

The Shock then put together another methodical drive.

Koala converted third-and-4 with a 7-yard run, gained another 4 yards on first down and then took the ball on **second-and-6 from the Columbus 10 with 7:35 left in the half**.

He scored.

The 10-yard touchdown made it **15–0** and turned Nashville''s statistical control into a substantial scoreboard advantage. More importantly, the play represented the core problem Columbus could not solve: even after seeing Koala carry the offense repeatedly, the Talons still could not keep him out of favorable situations.

Mini''s earlier 17-yard touchdown was the more explosive score. Koala''s touchdown was the one that transformed Nashville''s control into separation.

## Offensive Player of the Game

**Koala, Nashville Shock**

Koala''s workload was massive and his production justified every carry.

He rushed **41 times for 264 yards and a touchdown**, averaging 6.4 yards per attempt. He generated 15 rushing first downs and posted a long run of 26 yards.

The most significant part of the performance was its consistency. Koala did not reach 264 because of one enormous touchdown run. Nashville repeatedly used him to move the chains, repair unfavorable downs and keep Columbus'' defense on the field.

Mini''s 70 yards on five carries gave the Shock an explosive complement, but Koala was the structure of the offense. Nashville''s 354-yard rushing day does not happen without his ability to absorb 41 attempts while remaining efficient.

## Defensive Player of the Game

**Sloth, Nashville Shock**

Nashville''s defensive success was built on forcing Columbus into negative plays, and Sloth was one of the primary reasons.

He recorded **two tackles, both for loss**, giving him two of Nashville''s six tackles behind the line.

Those stops were particularly valuable because Columbus'' best chance to remain competitive was to lean on Black Dog and EMC. When the Talons stayed on schedule, both runners could produce. When Nashville won first contact in the backfield, the offense had little explosiveness available to recover.

Ernie also recorded two tackles for loss, making this a close selection, but Sloth''s repeated disruption best represented a Shock defense that allowed only six points despite Columbus running the ball 42 times.

## Summary

Nashville opened the season with a **21–6 divisional victory** behind Koala''s **264 rushing yards and a touchdown on 41 carries**. The Shock outrushed Columbus 354–176, produced 19 rushing first downs and kept the Talons scoreless until the fourth quarter. Columbus received 84 yards and a touchdown from Black Dog, but six tackles for loss repeatedly disrupted its attempts to build sustained drives.', '2026-08-13T00:33:00Z', 1, NULL),
('2026-w01-g3-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'd4c84c01-1802-5cf9-a08e-fa9cf93a6d30', 'regular', 1, 'game_recap', 'published', 'Blackie Explodes for 231 Yards as Tallahassee Makos Rout Richmond Rebellion, 27–9', NULL, 'Tallahassee''s season began with a warning to the rest of its division.

On the second offensive snap of the game, Blackie broke free for a 67-yard touchdown. Three quarters later, he had accumulated **231 rushing yards and two scores on 30 carries**, and the Makos had turned their divisional opener against Richmond into a **27–9 victory**.

Tallahassee rushed for **345 yards**, produced four rushing touchdowns and never trailed. Richmond generated a respectable 234 yards on the ground, including 193 from Baby, but the Rebellion spent nearly the entire game trying to recover from the explosive play that defined the opening minute.

Both teams entered their first game 0–0, making this the first meaningful divisional result of their seasons. Tallahassee emerged 1–0 with a performance that combined the league''s most dangerous kind of rushing output: explosive runs at the top of the depth chart and enough supporting production to prevent the defense from selling out against one player.

The Makos opened with Toad gaining 8 yards on first down.

On second-and-2 from their own 33, they went to Blackie.

He covered the remaining **67 yards for a touchdown with 14:18 still left in the first quarter**.

Richmond answered with a competent, patient drive. Baby helped move the Rebellion deep into Tallahassee territory, but the Makos stopped him short on third-and-4 and forced a field goal. Richmond cut the score to 6–3 with 7:58 remaining in the opening period.

The sequence revealed the difference that would persist all night.

Richmond could move the ball. Tallahassee could change the game in a single play.

The Makos added another touchdown just before the end of the first quarter. Blackie converted a third-and-1, then gained 5 more yards before Duncan entered the action and scored on a **12-yard run with three seconds remaining**.

Tallahassee led **12–3** after one quarter.

Richmond had already allowed two touchdown drives, but Blackie was not the only concern. Duncan''s score demonstrated the depth of a Tallahassee backfield that would eventually receive rushing touchdowns from three different players.

The second quarter slowed considerably. Tallahassee added a field goal with 8:04 remaining to make it 15–3, and the Makos took that advantage into halftime.

The score was significant because Richmond had not been completely overwhelmed statistically. Baby was carrying a heavy load and consistently finding moderate gains. He would finish with **193 yards and a touchdown on 35 carries**, an excellent opening-week performance under almost any other circumstance.

But Richmond needed 45 rushing attempts to accumulate 234 yards. Tallahassee reached 345 on 55.

That difference came from explosive runs and supporting production.

Blackie''s 67-yarder was the largest play, but the Makos also received 34 yards and a touchdown from Toad, 31 yards and a score from Duncan, 32 from Joey and 17 from Garfield. Blackie was the centerpiece rather than the entire operation.

Tallahassee also played the more disruptive defense.

The Makos produced **four tackles for loss**, led by Bulldog''s three. Richmond had three tackles for loss, including two from Junior, but was unable to consistently prevent Tallahassee from recovering after negative plays.

The Makos stretched their lead in the third quarter with another example of their willingness to stay aggressive on the ground.

Deep in Richmond territory, Tallahassee faced fourth-and-1 from the 9. Toad gained 4 yards to extend the possession. On the next snap, Blackie carried from the 5 and scored.

The touchdown with **5:47 remaining in the third quarter** pushed the advantage to **21–3**.

Richmond responded with its best touchdown drive of the game. Baby ripped off a 13-yard run, BMC followed with 8 and Baby scored from 7 yards out with 23 seconds remaining in the quarter.

The touchdown cut the margin to 21–9.

It was deserved reward for Baby, who accounted for more than 80 percent of Richmond''s rushing offense. BMC added 41 yards on nine attempts, but Richmond had little production beyond the top two backs.

Any hope that Baby''s touchdown might start a fourth-quarter comeback disappeared when Tallahassee again leaned on the depth of its rushing attack.

The Makos drove inside the Richmond 10. Joey gained 7 yards, Duncan was stopped for no gain, and Tallahassee faced **third-and-3 from the 6**.

Toad scored.

The 6-yard touchdown with **7:07 remaining** established the final 27–9 margin and capped a game in which Richmond never found a way to make Tallahassee dependent on only one runner.

Blackie remained the overwhelming star. His 231 yards included seven rushing first downs, two touchdowns and the 67-yard sprint that immediately reshaped the game.

But the Makos'' ability to finish possessions with Duncan and Toad made the offense harder to contain near the goal line.

Richmond''s Baby deserved similar credit in defeat. He produced 11 rushing first downs and averaged 5.5 yards per attempt despite carrying 35 times.

The difference was that Richmond needed Baby to be nearly everything.

Tallahassee did not.

## Defining Play

The game was only 42 seconds old.

Tallahassee had opened with an 8-yard Toad run and faced **second-and-2 from its own 33**. There was no established momentum yet, no scoreboard pressure and no long drive wearing down Richmond''s defense.

Blackie took the handoff and ran **67 yards for a touchdown**.

The play immediately established Tallahassee''s greatest advantage: Richmond could not afford even one failed fit or missed tackle against Blackie''s speed.

Richmond responded with a field goal and stayed competitive for much of the first half, but the Rebellion spent the entire night chasing the margin created by that first explosive run.

It was the most spectacular play of the game and the one that defined its competitive direction.

## Offensive Player of the Game

**Blackie, Tallahassee Makos**

Blackie rushed **30 times for 231 yards and two touchdowns**, averaging 7.7 yards per carry.

His 67-yard touchdown on Tallahassee''s second offensive snap set the tone. His 5-yard third-quarter score came one play after Toad converted fourth-and-1 and expanded the Makos'' lead to 21–3.

Blackie also produced seven rushing first downs and repeatedly turned routine carries into field-position advantages.

Baby''s 193-yard performance for Richmond was outstanding, but Blackie''s production came with greater explosiveness and directly powered the winning offense. Tallahassee outrushed Richmond by 111 yards, and Blackie alone nearly matched the Rebellion''s entire team total.

## Defensive Player of the Game

**Bulldog, Tallahassee Makos**

Bulldog was the most disruptive player on a Tallahassee defense that had to handle 45 Richmond rushing attempts.

He recorded **six tackles and three tackles for loss**, accounting for three of the Makos'' four stops behind the line.

That disruption was essential against Baby. Richmond''s featured runner consistently generated positive yardage once he reached the second level, so the best way to alter the Rebellion''s offense was to stop plays before they could develop.

Bulldog did that more frequently than any defender on the field.

Richmond still accumulated 234 yards, but too many possessions required the Rebellion to recover from negative snaps while already playing from behind. Bulldog''s penetration helped prevent Baby''s strong individual performance from turning into enough scoring drives to threaten Tallahassee''s lead.

## Summary

Tallahassee opened its season with a **27–9 divisional win** behind Blackie''s **231 rushing yards and two touchdowns**. His 67-yard score on the Makos'' second offensive snap immediately established control, and Tallahassee eventually rushed for 345 yards with touchdowns from Blackie, Duncan and Toad. Richmond received 193 yards and a touchdown from Baby, but Bulldog''s three tackles for loss and the Makos'' superior explosiveness kept the Rebellion chasing the game throughout.', '2026-08-11T15:33:00Z', 1, NULL),
('2026-w01-g4-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '5095e70e-76a9-5b81-aa61-94c6c64a755c', 'regular', 1, 'game_recap', 'published', 'Milwaukee Forge Win Defensive Grind, Hold Albuquerque Vortex Without a Touchdown in 9–3 Opener', NULL, 'For more than a half, neither Milwaukee nor Albuquerque could turn rushing production into points.

The difference was that Milwaukee remained patient long enough to finally break through — and its defense never did.

The Forge held the Vortex without a touchdown, produced **eight tackles for loss** and scored all nine of their points after halftime to escape Albuquerque with a **9–3 divisional victory** in one of Week 1''s most physical games.

Milwaukee rushed for **247 yards on 46 carries**, led by Trunky''s 130 yards and touchdown. Albuquerque finished with 184 yards on 52 attempts, with McGilla accounting for 143 of them.

Those totals indicate how close the matchup remained at the point of attack. Neither team consistently dominated every snap.

The decisive difference came from negative plays.

Milwaukee dropped Albuquerque runners for a loss eight times. Yankee recorded **four tackles for loss**, GreyBird added three and Trunky contributed another.

The Vortex produced six tackles for loss of their own, including four from Bevo, and that disruption helped keep the game scoreless through halftime.

Both clubs entered the divisional opener 0–0, so there was no season trend to confirm or reverse. The game instead became the first evidence of what each team might be: Milwaukee comfortable winning with defense and patience, Albuquerque capable of competing physically but vulnerable when its offense fell behind schedule.

The opening half was almost entirely about field position and missed opportunities.

McGilla carried the Albuquerque offense, but repeated penetration prevented the Vortex from building the kind of uninterrupted drives required to reach scoring range. Ming added only 15 yards on 12 attempts, while RBI Bear, Rolf and Skunkers combined for 26.

Milwaukee had more variety.

Trunky handled 27 carries, but McJagger contributed **72 yards on only six attempts**, Dog added 34 and Woodstock supplied 11.

Even with those complementary pieces, the Forge could not score in the first two quarters because Albuquerque''s front was producing nearly as much disruption as Milwaukee''s.

Bevo was the centerpiece of that resistance. He finished with 10 tackles and four tackles for loss, repeatedly forcing the Forge to restart possessions after unsuccessful first-down runs.

The scoreless tie finally broke early in the third quarter.

Milwaukee moved inside the Albuquerque 25 but again encountered resistance. Trunky gained only 1 yard on second-and-5, and Dog was stopped for no gain on third-and-4.

Rather than force the issue, the Forge took the points.

The field goal with **12:15 remaining in the third quarter** gave Milwaukee a **3–0 lead**.

In a game where possessions were routinely being derailed before runners could reach the second level, three points carried unusual weight.

Albuquerque now needed to produce a scoring drive against a defense that had spent the first half turning ordinary situations into long-yardage problems.

The Vortex could not answer before the end of the third quarter.

Milwaukee then created the first truly decisive offensive sequence early in the fourth.

The Forge began the possession already holding a 3–0 lead. Dog gained 2 yards on first down, setting up second-and-8 from the Albuquerque 28.

McJagger broke loose for **25 yards**, moving the ball to the 3.

On the next snap, Trunky scored.

The touchdown with **13:07 remaining in the fourth quarter** gave Milwaukee a **9–0 advantage** and changed the strategic shape of the game. Albuquerque could no longer hope to win with one scoring possession.

Trunky''s touchdown capped a strong individual night in which he rushed **27 times for 130 yards**, averaging 4.8 yards per carry despite Albuquerque''s six tackles for loss.

McJagger was even more efficient. His 72 yards came on six attempts, including the 25-yard run that created the game''s only touchdown.

Albuquerque continued feeding McGilla because little else was working consistently. He finished with **143 yards on 32 carries** and seven rushing first downs.

But his average of 4.5 yards per attempt was repeatedly offset by losses elsewhere in the offense.

Milwaukee''s pressure was particularly damaging when Albuquerque approached scoring territory. Yankee and GreyBird prevented the Vortex from simply leaning on McGilla and waiting for an eventual crease.

Albuquerque finally reached the scoreboard midway through the fourth quarter.

The Vortex moved deep into Milwaukee territory, but Ming lost 3 yards on second-and-7. McGilla gained only 1 on third-and-10, leaving Albuquerque facing fourth-and-9.

The Vortex kicked the field goal with **5:33 remaining**, cutting the score to **9–3**.

It was progress, but also another example of Milwaukee''s defense winning when the field shortened. Albuquerque had finally generated a scoring opportunity and still could not reach the end zone.

The final score accurately reflected the competitiveness of the game. Milwaukee did not dominate Albuquerque in total rushing production, and the Vortex defense repeatedly gave its offense chances.

But every important offensive possession required Albuquerque to overcome a loss, and the Vortex never produced the explosive answer Milwaukee received from McJagger.

One 25-yard run did not account for the entirety of a six-point victory.

It did, however, create the only touchdown in a game where touchdowns were extraordinarily difficult to find.

## Defining Play

Milwaukee led only **3–0 early in the fourth quarter**.

The Forge faced second-and-8 from the Albuquerque 28 after Dog gained 2 yards on first down. Given the way both defenses had controlled the game, another stalled possession could have left Milwaukee protecting only a field-goal margin.

McJagger changed that with one run.

He broke loose for **25 yards**, moving the ball to the Albuquerque 3. On the next snap, Trunky scored the game''s only touchdown.

The sequence expanded Milwaukee''s lead to **9–0 with 13:07 remaining** and forced Albuquerque to chase multiple scores in a game where the Vortex had not yet scored at all.

Trunky''s touchdown finished the possession, but McJagger''s 25-yard burst was the play that finally broke the defensive stalemate.

## Offensive Player of the Game

**Trunky, Milwaukee Forge**

Trunky carried the heaviest offensive burden in a game where very little came easily.

He rushed **27 times for 130 yards and the game''s only touchdown**, producing eight rushing first downs and a long gain of 18 yards.

The absence of a huge breakaway run makes the total more impressive. Albuquerque consistently created penetration — six Milwaukee rushing attempts ended in tackles for loss — but Trunky continued generating enough positive yardage to keep the Forge offense functional.

McJagger''s 72 yards on six attempts provided the game''s most important explosive play, but Trunky''s workload and fourth-quarter touchdown made him the central figure in Milwaukee''s scoring formula.

## Defensive Player of the Game

**Yankee, Milwaukee Forge**

In a game defined by defensive penetration, Yankee was the most disruptive defender on the winning side.

He recorded **five tackles, including four tackles for loss**.

Milwaukee finished with eight tackles for loss as a team, meaning Yankee personally accounted for half of them.

Those negative plays were devastating to an Albuquerque offense so dependent on McGilla. The Vortex had enough rushing production to move the football, but too many drives required them to recover after being pushed backward.

GreyBird also delivered an exceptional performance with three tackles for loss, while Trunky added one. Together, that group ensured Albuquerque never reached the end zone.

## Summary

Milwaukee opened its season with a **9–3 divisional victory** by holding Albuquerque without a touchdown and recording eight tackles for loss. Trunky rushed for **130 yards and the game''s only touchdown**, while McJagger''s 25-yard fourth-quarter run created the decisive scoring opportunity. McGilla carried Albuquerque with 143 yards, but Yankee''s four tackles for loss led a Forge defense that repeatedly forced the Vortex off schedule.', '2026-08-11T15:33:00Z', 1, NULL),
('2026-w01-g5-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '506cabe0-d9e5-540b-b4e4-a0055fa3999c', 'regular', 1, 'game_recap', 'published', 'Bobo''s Three Touchdowns, Luke''s 253 Yards Carry San Antonio Outlaws Past Sacramento Gold Rush, 27–15', NULL, 'San Antonio had the game''s most productive runner. It also had the runner who kept finishing his drives.

That combination proved too much for Sacramento.

Luke rushed for **253 yards on 37 carries**, Bobo added **124 yards and three touchdowns on 17 attempts**, and the Outlaws piled up **377 rushing yards** in a **27–15 divisional victory** over the Gold Rush.

Sacramento did enough offensively to make San Antonio work for the result. Kiwi rushed for 160 yards, and the Gold Rush erased a 15–6 halftime deficit by tying the game in the third quarter.

But when the game reset at 15–15, San Antonio''s two-headed rushing attack took over again.

Bobo scored twice in the fourth quarter, including the go-ahead touchdown with 10:28 remaining, allowing the Outlaws to turn a tie game into a 12-point opening-week win.

Both teams entered the divisional opener without a previous result, making the game an immediate opportunity to establish position within the West.

Sacramento struck first.

Kiwi helped move the Gold Rush into San Antonio territory with a 16-yard first-down run. Micro followed with 9, and Moose scored from **14 yards out with 6:43 remaining in the first quarter**.

The touchdown gave Sacramento a 6–0 lead.

San Antonio needed barely more than a minute to answer.

Luke was dropped for a 2-yard loss on the Outlaws'' first play of the next possession, then gained 4 on second down. That left San Antonio facing **third-and-8 from its own 27**.

Luke broke free.

His **73-yard touchdown** tied the score at 6–6 with 5:27 remaining.

It was the game''s first indication that Sacramento''s defensive success behind the line would not necessarily translate into control. The Gold Rush eventually recorded **six tackles for loss**, including four from Percy and two from Kiwi.

But San Antonio could lose a few yards on one snap and erase the entire field on the next.

The Outlaws took their first lead midway through the second quarter after marching to the Sacramento 1. Luke was stopped just short on consecutive plays before Bobo scored on **third-and-1**.

The 1-yard touchdown made it 12–6.

San Antonio added a field goal in the final minute of the half, carrying a **15–6 advantage** into the break.

The nine-point margin did not reflect a game Sacramento was prepared to surrender.

Kiwi continued to handle the bulk of the Gold Rush offense. He finished with **160 yards on 28 carries**, producing nine rushing first downs and repeatedly keeping Sacramento in manageable situations.

The Gold Rush opened the third-quarter scoring with a field goal, trimming the margin to 15–9.

Later in the quarter, Sacramento completed the comeback.

Kiwi helped move the ball inside the San Antonio 10, but consecutive 1-yard gains left the Gold Rush facing **third-and-8 from the 9**.

Instead of going back to Kiwi, Sacramento turned to Micro.

He scored from 9 yards out with **3:11 remaining in the third quarter**, tying the game **15–15**.

At that point, Sacramento had successfully absorbed Luke''s 73-yard touchdown and San Antonio''s 15 first-half points. The game had effectively restarted.

What followed separated the teams.

San Antonio returned to Luke and Bobo.

Luke''s value was not limited to the early 73-yard touchdown. He repeatedly carried the Outlaws between scoring areas, while Bobo became the finisher.

Early in the fourth quarter, Luke gained 6 yards and then converted a first down with a 5-yard run, moving San Antonio to the Sacramento 2.

Bobo scored from there with **10:28 remaining**.

The touchdown restored San Antonio''s lead at **21–15**.

Sacramento still had time, but the Gold Rush could not match the Outlaws'' ability to sustain production without being derailed by negative plays.

That was particularly notable because Sacramento''s defense was creating more backfield disruption than San Antonio''s. Percy had four tackles for loss, and Kiwi added two while also carrying 28 times on offense.

San Antonio recorded only one tackle for loss defensively.

Yet the Outlaws were the team better equipped to overcome lost-yardage snaps.

Luke averaged 6.8 yards per carry. Bobo averaged 7.3. Together they accounted for **377 rushing yards**, exactly matching San Antonio''s entire team rushing total outside of Olaf''s net-zero contribution.

Sacramento finished with a solid **246 rushing yards on 40 carries**. Kiwi led the way, Moose added 43 yards and a touchdown on five attempts, and Micro contributed 39 yards and another score.

Those are winning-caliber numbers in many games.

They were not enough against an Outlaws offense that produced 20 rushing first downs and 10 gains of at least 10 yards.

San Antonio finally created separation late in the fourth.

With Sacramento still trailing 21–15, Luke gained 10 yards and then 11 more on consecutive first-down carries, moving the Outlaws inside the 5.

Bobo finished the drive from **5 yards out with 3:07 remaining**, scoring his third touchdown and making it **27–15**.

The touchdown ended Sacramento''s realistic comeback opportunity.

Luke had supplied the field position. Bobo supplied the points.

It was a complementary relationship Sacramento never completely solved.

The Gold Rush could penetrate and create negative plays. Percy in particular repeatedly disrupted San Antonio near the line of scrimmage.

But every defensive victory carried the possibility of being undone by one Luke run. And once San Antonio reached short-yardage territory, Bobo was consistently effective enough to finish.

The result left the Outlaws 1–0 with a divisional victory and one of Week 1''s most productive rushing performances.

Sacramento fell to 0–1 despite 160 yards from Kiwi and a comeback that briefly erased a nine-point halftime deficit.

## Defining Play

Sacramento had just completed the game''s biggest momentum swing.

The Gold Rush entered halftime down 15–6, scored nine unanswered points in the third quarter and tied the game **15–15** on Micro''s 9-yard touchdown.

San Antonio''s response determined whether the comeback would change control of the game.

Early in the fourth quarter, Luke carried the Outlaws into the red zone. He gained 6 yards and followed with a 5-yard first down, moving the ball to the Sacramento 2.

On the next snap, **Bobo scored from 2 yards out with 10:28 remaining**.

The touchdown made it **21–15** and immediately restored San Antonio''s control after Sacramento had spent an entire quarter fighting back.

Bobo would score again later, but the first fourth-quarter touchdown was the play that prevented the Gold Rush comeback from ever becoming a lead.

## Offensive Player of the Game

**Luke, San Antonio Outlaws**

Bobo scored three touchdowns and deserves enormous credit for finishing drives, but Luke was the player who fundamentally changed the geometry of the game.

He rushed **37 times for 253 yards and a touchdown**, averaging 6.8 yards per attempt and producing 11 rushing first downs.

His 73-yard touchdown on third-and-8 answered Sacramento''s opening score almost immediately. Beyond that explosion, Luke repeatedly moved San Antonio into positions where Bobo could finish.

The late sequence that set up Bobo''s final touchdown captured the partnership: Luke gained 10 and 11 yards on consecutive carries, moving San Antonio deep into Sacramento territory before Bobo scored from 5.

Bobo''s **124 yards and three touchdowns** made this one of the strongest two-runner performances of the opening week, but Luke''s 253 yards were the foundation.

## Defensive Player of the Game

**Percy, Sacramento Gold Rush**

The game''s most disruptive defensive performance came from the losing side.

Percy recorded **seven tackles and four tackles for loss**, consistently giving Sacramento opportunities to get San Antonio behind schedule.

The Gold Rush finished with six tackles for loss, and Percy accounted for four of them. Against almost any ordinary rushing performance, that level of disruption could have controlled the game.

San Antonio was simply too explosive once it escaped the backfield.

Luke''s 73-yard touchdown demonstrated the problem perfectly: Sacramento could create a negative play on one snap and give up the entire field two plays later.

Percy''s impact kept Sacramento competitive and helped give the Gold Rush enough possessions to erase a 15–6 halftime deficit, even though the defense ultimately could not contain Luke and Bobo for four quarters.

## Summary

San Antonio opened the season with a **27–15 divisional victory** behind one of Week 1''s strongest backfield performances. Luke rushed for **253 yards and a touchdown**, while Bobo added **124 yards and three scores** as the Outlaws finished with 377 rushing yards. Sacramento tied the game 15–15 in the third quarter behind Kiwi''s 160-yard performance and touchdowns from Moose and Micro, but Bobo scored twice in the fourth quarter to restore and then extend San Antonio''s lead.', '2026-08-11T15:33:00Z', 1, NULL),
('2026-w02-clt-tal-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'b67a2afc-5eca-5f3f-a4c8-787d3ec82412', 'regular', 2, 'game_recap', 'published', 'Tweety’s Two Touchdowns, Late Safety Lift Charlotte Kingsmen Past Tallahassee Makos, 20–15', NULL, 'Charlotte did not need to completely stop Blackie to beat Tallahassee. The Kingsmen needed to make everybody else work harder, create enough negative plays to keep the Makos from finishing drives and find their own source of explosiveness.

Tweety supplied the latter, and Charlotte’s defensive front handled the rest.

Tweety rushed for **132 yards and two touchdowns on 15 carries**, including a 39-yard third-quarter score, and the Kingsmen produced a critical safety with 2:16 remaining to hold off the Makos **20–15**. Charlotte evened its record at **1–1** after opening the season with an 18–12 loss at Portland, while Tallahassee fell to **1–1** after entering the night with one of the East’s strongest Week 1 results, a 27–9 victory over Richmond.

The contrast from the opening week was significant. Charlotte had allowed Portland to rush for **352 yards** in its opener, including 301 from Ezekiel. Tallahassee, meanwhile, had run for **345 yards** against Richmond behind Blackie’s 231-yard performance. That made the matchup appear particularly dangerous for a Kingsmen defense that had already been gashed once.

Blackie was still outstanding. He carried **33 times for 180 yards and a touchdown**. But Charlotte limited the rest of Tallahassee’s offense to **51 rushing yards on 23 attempts** and repeatedly forced the Makos to overcome losses before they could reach the open field. Tallahassee surrendered **nine tackles for loss**, three apiece to Lil Slushie and BlackBird, while Charlotte’s offense encountered only five.

That difference in consistency helped explain why the Kingsmen could survive a game that remained competitive until the final minutes.

Charlotte established its approach immediately. The Kingsmen took the opening possession at their own 25 and ran the ball 12 consecutive times over a **75-yard touchdown drive**. T’Challa did most of the early work, including a 29-yard burst on third-and-11, while Rat added a 10-yard conversion before Tweety finished the march with a **3-yard touchdown with 7:54 left in the first quarter**.

It was a revealing opening statement. Charlotte was not simply trying to ride one runner. T’Challa handled the volume, Tweety supplied speed and the offensive line repeatedly created enough space to stay ahead of the chains.

Tallahassee’s first answer stalled when consecutive losses of 1 and 4 yards put Blackie and the Makos behind schedule. They punted, and although Charlotte also went three-and-out on its next possession, the Kingsmen had already demonstrated the formula that would carry them through the night: force Tallahassee to string together long drives while relying on a deeper rushing rotation of their own.

The Makos finally broke through early in the second quarter. Blackie’s **32-yard run on third-and-7** moved Tallahassee deep into Charlotte territory, but the Kingsmen tightened from there. Joey was dropped for a 2-yard loss, and the Makos settled for a field goal to make it **6–3**.

That sequence became a recurring theme. Blackie could flip the field, but Charlotte prevented too many of his explosive runs from becoming touchdowns.

The Kingsmen answered with a field-goal drive highlighted by Tweety’s **35-yard run**, then added another three points late in the half. Charlotte therefore carried a **12–3 lead** despite scoring only one first-half touchdown. The difference was drive completion: when the Kingsmen reached scoring range, they consistently came away with points, while Tallahassee spent too much of the half fighting through second- and third-and-long situations created by penetration up front.

Tallahassee finally converted its rushing success into a touchdown with **8:21 remaining in the third quarter**. The possession had actually begun in the final minute of the first half and stretched 17 plays. Blackie did most of the damage after intermission, ripping off gains of 23, 11 and 10 yards before scoring from 9 yards out.

The drive cut Charlotte’s lead to **12–9** and represented the Makos at their best: patient enough to continue feeding Blackie and physical enough to survive several unfavorable down-and-distance situations.

Charlotte’s response was immediate and decisive.

The Kingsmen drove from their own 25, converting three separate third downs. With **2:08 left in the third quarter**, they faced third-and-8 from the Tallahassee 39. Tweety broke through the first wave, escaped into the secondary and went the full **39 yards for his second touchdown**.

The play pushed the margin back to **18–9** and underscored why Charlotte’s backfield presented Tallahassee with a different problem than it had faced in Week 1. T’Challa carried **32 times for 123 yards**, giving the Kingsmen a dependable interior workload, but Tweety transformed those steady gains into points. Charlotte finished with **308 rushing yards on 56 carries**, with Tigger adding 34 yards on five attempts and Rat contributing 10 yards on his lone rush.

That balance mattered because Tallahassee’s defense did occasionally win at the line. Bulldog and Toad each made two tackles for loss, and Duncan added another. But Charlotte repeatedly recovered from those setbacks because its runners produced **seven gains of at least 10 yards and three of at least 20**.

Tallahassee had one more push.

Trailing 18–9 in the fourth quarter, the Makos began at their own 31 and marched **69 yards over 14 plays**. Blackie converted gains of 11 and 8 yards, and Toad supplied two of the drive’s biggest plays — a 7-yard conversion on fourth-and-3 and a 13-yard run that put Tallahassee at the Charlotte 1. After Toad was dropped for a 1-yard loss, Duncan scored from 2 yards out with **6:04 remaining**.

Suddenly it was **18–15**.

Charlotte could not put the game away on its ensuing possession. The Kingsmen reached midfield but eventually punted, giving Tallahassee another opportunity with the margin still only three.

That was when the game turned for good.

## Defining Play

With **2:16 remaining**, Tallahassee took over backed up at its own 3-yard line, trailing 18–15. The Makos had just produced a 14-play touchdown drive on their previous possession and needed only a field goal to potentially erase what had once been a nine-point second-half deficit.

Instead, Charlotte’s defensive line overwhelmed the play immediately.

On first-and-10, Toad took the handoff and was driven backward. **Lil Slushie finished the play in the end zone for a 3-yard loss and a safety**, extending Charlotte’s lead to **20–15**.

The five-point margin changed the entire endgame. Tallahassee no longer had a path to tie the score with a field goal, and Charlotte regained possession after the safety. Even though the Kingsmen did not record another first down, the clock was reduced to 18 seconds before the Makos got the ball again.

Tallahassee’s final snap was a 1-yard Blackie run. The comeback was over.

## Offensive Player of the Game

**Tweety, Charlotte Kingsmen**

T’Challa was the engine of Charlotte’s offense, carrying 32 times, but Tweety was its difference-maker.

He finished with **132 yards and two touchdowns on only 15 attempts**, an average of **8.8 yards per carry**. His first score capped Charlotte’s methodical 12-play opening drive. His second came from 39 yards on third-and-8 just after Tallahassee had pulled within 12–9, immediately restoring control to the Kingsmen.

Tweety also supplied a 35-yard run that set up Charlotte’s first field goal and a 16-yard gain during another scoring opportunity. His ability to create explosive yardage kept the Kingsmen from becoming dependent on long, grinding possessions and gave Charlotte the complementary threat it lacked in a Week 1 loss when its offense was outproduced on the ground by Portland.

## Defensive Player of the Game

**Lil Slushie, Charlotte Kingsmen**

Blackie’s 180 yards make clear that Charlotte did not shut down the Makos’ primary runner. What Lil Slushie and the Kingsmen did instead was consistently wreck the structure around him.

Lil Slushie recorded **seven tackles and three tackles for loss**, tied for the team lead in tackles behind the line. He was particularly effective when Tallahassee tried to establish other runners or when the Makos were forced into unfavorable situations. Charlotte held Joey to 19 yards on nine carries, Toad to 22 on eight and Duncan to seven on five.

His biggest contribution, however, came with the entire game still undecided. The safety with 2:16 left turned an 18–15 game in which Tallahassee needed only a field goal into a 20–15 game that required a touchdown, while also taking the ball away from the Makos at the worst possible time.

Charlotte’s defense allowed **231 rushing yards**, but it produced **nine tackles for loss** and made enough drive-killing plays to prevent Tallahassee’s ground production from translating into more points. No defender embodied that pattern more than Lil Slushie.

## Summary

Charlotte answered a season-opening loss with a **20–15 victory** built on 308 rushing yards, Tweety’s 132-yard, two-touchdown performance and a disruptive defensive front. Tallahassee remained dangerous behind Blackie’s 180 rushing yards, but nine tackles for loss repeatedly stalled the Makos, and Lil Slushie’s safety with 2:16 remaining provided the final separation in an East matchup that left both teams at 1–1.', '2026-08-13T00:33:00Z', 1, NULL),
('2026-w01-power-rankings', '97808f43-a0d5-5251-bf8d-fae1643c8258', NULL, 'regular', 1, 'power_rankings', 'published', 'Way-Too-Early Power Rankings: Tallahassee Claims No. 1 After Statement Week 1', 'Tallahassee opens at No. 1 after a dominant 27–9 divisional win, followed by San Antonio and Nashville. Portland owns Week 1’s most spectacular individual performance, Milwaukee has the strongest early defensive identity, and several 0–1 teams remain closer to the middle than their records suggest.', 'One week is enough to produce evidence. It is not nearly enough to produce certainty.

That is the entire point of the first power rankings of the season.

Five teams are 1–0 and five are 0–1, but the opening week already gave us very different kinds of performances: overwhelming rushing attacks, suffocating defensive fronts, superstar individual efforts and a few losses that looked considerably better than the final record suggests.

Tallahassee, San Antonio and Nashville all made convincing claims to the top spot. Portland may have produced the most spectacular individual performance of the week. Milwaukee won a completely different kind of game, while Charlotte and Sacramento both showed enough in defeat to remain within striking distance of the winning half of the league.

So, with the necessary reminder that these are **way-too-early** rankings, here is where the league stands after Week 1.

## 1. Tallahassee Makos — 1-0

No team combined offense, margin and defensive control as convincingly as Tallahassee.

The Makos beat Richmond **27–9**, rushed for **345 yards** and never trailed. Blackie immediately announced himself as one of the league’s premier offensive players with **231 yards and two touchdowns on 30 carries**, including a 67-yard touchdown on Tallahassee’s second offensive snap.

What pushes the Makos to No. 1 is that the offense was not completely dependent on him. Toad, Joey, Duncan and Garfield combined for 114 additional rushing yards, while Duncan and Toad also scored touchdowns. On defense, Bulldog recorded three tackles for loss and Tallahassee kept Richmond from turning Baby’s excellent 193-yard rushing day into enough points to threaten the game.

One week in, Tallahassee looks explosive, deep and capable of finishing drives.

## 2. San Antonio Outlaws — 1-0

If the rankings were based purely on offensive ceiling, San Antonio might already be No. 1.

The Outlaws rushed for a Week 1-best **377 yards** in a **27–15 win over Sacramento**. Luke carried 37 times for **253 yards and a touchdown**, while Bobo added **124 yards and three scores on 17 attempts**.

Just as important, San Antonio responded when Sacramento made the game uncomfortable. The Gold Rush erased a 15–6 halftime deficit and tied the score 15–15 in the third quarter. The Outlaws answered with two fourth-quarter Bobo touchdowns.

The only reason San Antonio sits second is defense. Sacramento still ran for 246 yards. If that side of the ball catches up to the Luke-Bobo backfield, the Outlaws may not stay at No. 2 for long.

## 3. Nashville Shock — 1-0

Nashville’s opening performance may have been the most complete domination of the line of scrimmage.

The Shock beat Columbus **21–6** and held a **354–176 advantage in rushing yards**. Koala carried 41 times for **264 yards and a touchdown**, repeatedly keeping Nashville ahead of the chains without relying on one enormous breakaway. Mini added 70 yards on only five attempts.

The defense was just as encouraging. Nashville produced six tackles for loss and kept Columbus scoreless until the fourth quarter.

Tallahassee gets the edge because of the larger scoring margin, and San Antonio owns the league’s most explosive two-back combination. But Nashville already looks built to control games for four quarters.

## 4. Portland Wildfire — 1-0

Portland owns the most frightening question any defense has to answer after Week 1: what exactly are you supposed to do with Ezekiel?

The Wildfire runner produced the week’s signature individual performance with **301 yards and three touchdowns on 33 carries** in an 18–12 victory over Charlotte. His first two touchdowns both traveled 71 yards.

Portland finished with **352 rushing yards**, giving the Wildfire a statistical profile comparable to the teams above them.

The concern is what happened after halftime. Charlotte held Portland scoreless over the final two quarters and turned an 18–3 deficit into an 18–12 game. Ezekiel was extraordinary, but the rest of the Wildfire rushing attack combined for only 51 yards.

Portland is undefeated and has the league’s most devastating individual weapon through one week. The next question is whether the Wildfire can win when an opponent finally contains him.

## 5. Milwaukee Forge — 1-0

Milwaukee is the hardest 1–0 team to compare with the others because its opener looked nothing like the league’s offensive showcases.

The Forge beat Albuquerque **9–3**, held the Vortex without a touchdown and produced **eight tackles for loss**. Yankee recorded four of them, GreyBird added three and Milwaukee repeatedly turned manageable Albuquerque situations into long-yardage problems.

Offensively, Trunky carried 27 times for **130 yards and the game’s only touchdown**, while McJagger supplied 72 yards on six attempts and broke the 25-yard run that set up that score.

Nine points leaves questions about offensive ceiling, but there is something reassuring about already knowing Milwaukee can win a low-scoring game with defense.

## 6. Charlotte Kingsmen — 0-1

The first losing team in the rankings also produced the most encouraging loss.

Charlotte fell **18–12 at Portland**, but the Kingsmen were down 18–3 before holding the Wildfire scoreless for the entire second half. T’Challa rushed for **159 yards and a touchdown on 32 carries**, Tweety added 77 on 12 attempts and Charlotte finished with **250 rushing yards**.

The obvious problem is impossible to ignore: the Kingsmen allowed 352 rushing yards and watched Ezekiel run for 301 by himself.

Still, Charlotte showed more resistance than the other Week 1 losers. The offense stayed functional, the defense adjusted after halftime and the Kingsmen had a one-score game in the fourth quarter after appearing headed for a blowout.

## 7. Sacramento Gold Rush — 0-1

Sacramento deserves more credit than a 12-point loss usually receives.

The Gold Rush fell **27–15 to San Antonio**, but they erased a nine-point halftime deficit and tied the game 15–15 in the third quarter. Kiwi rushed for **160 yards on 28 carries**, while Moose and Micro both scored touchdowns.

Sacramento also produced six tackles for loss, including four from Percy.

The issue was surviving once San Antonio’s runners escaped the backfield. Luke’s 73-yard touchdown was the most obvious example, and the Gold Rush eventually surrendered 377 rushing yards.

Sacramento is 0–1, but this did not look like one of the league’s weakest teams.

## 8. Richmond Rebellion — 0-1

There is a strange tension in Richmond’s opener.

The Rebellion lost **27–9**, the largest defeat of Week 1, yet Baby rushed for **193 yards and a touchdown on 35 carries** and Richmond still produced 234 rushing yards against the team sitting atop these rankings.

The problem was that Tallahassee consistently produced the bigger play and finished more drives. Blackie’s 67-yard touchdown immediately put Richmond behind, and the Makos had enough additional weapons to prevent the Rebellion from concentrating solely on him.

Richmond has something real to build around in Baby. The ranking stays low because a productive rushing total cannot erase an 18-point divisional loss.

## 9. Albuquerque Vortex — 0-1

Albuquerque’s defense played well enough to give the Vortex a chance. The offense never rewarded it.

The **9–3 loss to Milwaukee** was scoreless at halftime, and Bevo produced **four tackles for loss** as Albuquerque’s defense repeatedly disrupted the Forge rushing attack.

McGilla also provided legitimate offensive production with **143 yards on 32 carries**.

Everything around him was the problem. Albuquerque finished with only 184 rushing yards as a team, meaning the rest of the offense combined for just 41. Milwaukee produced eight tackles for loss and kept the Vortex out of the end zone for the entire game.

## 10. Columbus Talons — 0-1

Someone has to start at the bottom, and after one week it is Columbus.

The Talons lost **21–6 to Nashville**, were outrushed **354–176** and did not score until the fourth quarter. Black Dog led the offense with 84 yards and a touchdown on 22 carries, while EMC added 73 yards on 13 attempts.

Those individual numbers are respectable. The overall offensive profile was not. Columbus managed only two runs of at least 10 yards and surrendered six tackles for loss, allowing Nashville to dictate down-and-distance throughout the afternoon.

It is only Week 1, but compared with the other winless teams, Columbus showed the least ability to either threaten explosively or control the game defensively.

## The Week 1 Takeaway

The top of the league already has distinct identities.

Tallahassee looks like the most balanced contender. San Antonio owns the most explosive backfield. Nashville may be the most methodical team in the league. Portland has the individual player nobody wants to see in open space. Milwaukee appears perfectly comfortable winning with defense.

The more interesting question may be how quickly the bottom half can close the gap.

Charlotte and Sacramento already looked competitive enough to move dramatically with one win. Richmond has a 193-yard runner to build around. Albuquerque has a defense capable of keeping games close. Columbus gets the first opportunity to prove that one difficult afternoon against Nashville was not a permanent identity.

These rankings will probably look foolish soon. That is what makes the first edition fun.', '2026-08-13T17:40:00Z', 1, NULL),
('2026-w02-ric-nas-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'aa54bb81-384c-5473-a7f6-d3d035a6dbba', 'regular', 2, 'game_recap', 'published', 'Koala Runs Wild Again as Nashville Shock Bury Richmond Early, Cruise to 24–9 Divisional Win', NULL, 'For the second straight week, Nashville gave an East opponent the same problem to solve.

For the second straight week, nobody came particularly close to solving it.

Koala rushed for **250 yards and three touchdowns on 31 carries**, Nashville piled up **350 rushing yards**, and the Shock jumped on Richmond from the opening snap before cruising to a **24–9 divisional victory**.

The win moves Nashville to **2–0**, while Richmond falls to **0–2** after beginning its season with consecutive divisional losses.

What makes Nashville''s start particularly imposing is how repeatable it already looks. The Shock rushed for 354 yards in a 21–6 Week 1 victory over Columbus. One week later, they generated 350 more while increasing their scoring output to 24 points.

Koala has been the centerpiece of both performances. After carrying 41 times for 264 yards against Columbus, he somehow became even more explosive with a lighter workload against Richmond, averaging **8.1 yards per carry** and scoring all three Nashville touchdowns.

The tone was established immediately.

Nashville received the opening possession at its own 25. There was no methodical drive, no feeling-out period and no need to establish anything over multiple snaps.

Koala took the first offensive play **75 yards for a touchdown**.

With 15:00 showing on the first-quarter clock, Richmond was already behind 6–0.

For a Rebellion team attempting to recover from a 27–9 Week 1 loss to Tallahassee, it was nearly the worst possible beginning. Richmond had allowed Blackie to score from 67 yards on Tallahassee''s second offensive snap the previous week. Seven days later, another premier East runner needed only one play.

Richmond''s first possession initially offered some resistance. Baby gained 6 yards twice to move the chains, but Nashville''s defensive front quickly took over. Sloth dropped BMC for a 2-yard loss, then stopped Baby for another loss on third-and-11, forcing the Rebellion to punt.

That combination — Koala creating explosive offense while Nashville''s front created negative plays — defined the game.

After Richmond''s punt, the Shock went back to work.

Mini converted third-and-5 with an 8-yard run. Koala later gained 10 on second-and-8, and Mini added another 8-yard conversion on third-and-6. Nashville eventually faced third-and-2 at the Richmond 30.

Koala broke through for **22 yards**, putting the Shock at the 8.

On the next snap, he scored.

The **8-yard touchdown with 4:31 remaining in the first quarter** pushed Nashville''s lead to 12–0 and made the opening period feel less like an early advantage than the beginning of another divisional rout.

Richmond could not answer.

The Rebellion''s next possession produced only five net yards before another punt. Nashville briefly stalled as well, punting late in the first quarter, but Richmond''s offense continued to fight through penetration.

That was a significant change from Week 1.

Baby had rushed for **193 yards on 35 carries** against Tallahassee despite Richmond''s loss. He had been one of the few unquestioned positives from the opener.

Nashville made sure there would be no repeat performance.

Baby finished Week 2 with **102 yards and a touchdown on 26 carries**, but even that total required a late fourth-quarter surge. For much of the afternoon, he was repeatedly being forced to restart plays after Nashville won at the line of scrimmage.

Sloth was at the center of it.

Nashville ultimately recorded **nine tackles for loss**, with Sloth producing five of them by himself. Ernie added three more and Barnsworth another.

Richmond''s entire offense finished with only **165 rushing yards on 42 attempts**, a substantial decline from the 234 yards it produced against Tallahassee.

Meanwhile, Nashville continued operating with remarkable consistency.

The Shock''s third touchdown drive came late in the second quarter and demonstrated that the offense could be effective even when Koala was not producing a 75-yard explosion.

Mini gained 4 to begin the possession. Koala converted third-and-4 with a 6-yard run. Leon Gory followed with 7, and Junior — used as a runner — broke off a 12-yard gain.

Koala then supplied a 14-yard first down before Leon Gory converted another third down.

The drive eventually reached the Richmond 2 after Mini gained 8 yards on third-and-2.

Koala finished it from there.

His **2-yard touchdown with 3:48 remaining before halftime** made it **18–0**.

By that point, Richmond had already spent most of the half defending a Nashville rushing attack that could attack in several different ways. Mini finished with **52 yards on eight carries**, Leon Gory added 28 on nine attempts, Junior gained 12 on his only rush and Ernie and Oliver contributed additional yardage.

None approached Koala''s production, but they did not need to. Their value was in preventing Richmond from treating every Nashville snap as though only one runner mattered.

The Shock added a field goal with five seconds left in the half to take a **21–0 lead** into the locker room.

Richmond had been shut out for 30 minutes.

The Rebellion finally generated their best offensive stretch to open the third quarter.

Baby gained 4 and 5 yards before converting third-and-1. BMC then produced consecutive first-down runs of 12 and 7 yards, and Baby later broke a 9-yard gain that moved Richmond deeper into Nashville territory.

But once the Rebellion approached scoring range, the Shock''s defensive front reappeared.

Baby was stopped for a 1-yard loss on second down and then held for no gain on third-and-8. Richmond settled for a field goal with **8:24 remaining in the third quarter**.

The score was 21–3.

That sequence was a concise explanation for why the game remained so one-sided despite Richmond occasionally moving the ball. Nashville did not need to eliminate every productive run. It needed to create enough negative plays to force Richmond into third-and-long situations before the field shortened.

Richmond produced only three tackles for loss against Nashville.

Nashville produced nine.

That six-play difference behind the line of scrimmage repeatedly altered possessions.

The Shock added another field goal early in the fourth quarter after Koala again generated the drive''s biggest play. With Nashville facing second-and-9 from the Richmond 37 as the quarter began, Koala ripped off a **25-yard run** to the 12.

Richmond prevented another touchdown, but the field goal with **12:04 remaining** extended the advantage to **24–3**.

Only then did Richmond finally put together the kind of sustained scoring drive it had been searching for all afternoon.

Baby began to find more room. He converted third-and-3 with an 11-yard run, followed with a 19-yard burst, then added gains of 7 and 13 yards later in the possession.

With 5:35 remaining, Baby scored from **9 yards out**, cutting Nashville''s lead to 24–9.

It was Richmond''s best offensive sequence, and it pushed Baby over 100 rushing yards for the second consecutive week.

It was also far too late.

Nashville responded by keeping the ball on the ground, converting another third down through Koala and draining the clock before punting with just over a minute remaining.

Richmond managed one final first down, but the outcome had been decided long before.

Through two games, Nashville has now scored **45 points while allowing only 15**. The Shock have rushed for **704 yards** across those two victories.

Richmond, meanwhile, has scored exactly nine points in each of its first two games. The Rebellion have now lost divisional games to Tallahassee and Nashville by a combined score of **51–18**.

The season is still young, but the early trajectories could hardly be more different.

## Defining Play

It is difficult to choose anything other than the first snap.

Nashville began the game at its own 25 with the score 0–0.

Koala took the opening handoff and went **75 yards for a touchdown**.

There was no buildup. Richmond was immediately forced into the exact kind of game it could least afford after its Week 1 loss: chasing an explosive divisional opponent from behind.

The significance was larger than six points.

Richmond had watched Tallahassee''s Blackie break a 67-yard touchdown on the Makos'' second offensive snap one week earlier. Koala''s 75-yard score showed almost immediately that the Rebellion''s explosive-run problem had followed them into Week 2.

Nashville never trailed and never allowed Richmond to get within two scores after that play.

## Offensive Player of the Game

**Koala, Nashville Shock**

Koala followed a 264-yard Week 1 performance with **250 rushing yards and three touchdowns on 31 carries**.

That gives him **514 rushing yards through Nashville''s first two games**.

Against Richmond, he averaged 8.1 yards per carry and produced the game''s defining 75-yard touchdown on his first attempt. He later broke runs of 22, 25, 15, 14, 11 and 10 yards while repeatedly converting critical downs.

His three touchdowns accounted for all of Nashville''s trips to the end zone.

The most impressive part may be that Nashville actually reduced his workload from 41 carries in Week 1 to 31 in Week 2 without sacrificing production. Mini, Leon Gory and the rest of the rotation provided enough support for Koala to remain explosive rather than simply absorbing volume.

Through two weeks, there may not be a more consistent offensive centerpiece in the league.

## Defensive Player of the Game

**Sloth, Nashville Shock**

Koala provided the highlights. Sloth helped make sure Richmond never had the opportunity to match them.

Sloth finished with **12 tackles and five tackles for loss**, leading a Nashville defense that produced nine stops behind the line of scrimmage.

His impact was particularly important against Baby.

Richmond''s featured runner entered Week 2 after rushing for 193 yards against Tallahassee. Nashville held him to **102 yards on 26 carries**, and much of that production came during the Rebellion''s late fourth-quarter touchdown drive.

Sloth repeatedly disrupted Richmond before its rushing concepts could develop. He made tackles for loss in the first and second quarters, continued creating penetration after halftime and remained involved deep into the fourth.

Richmond''s problem was not that every play failed. It was that Nashville created enough losses to constantly interrupt otherwise promising possessions.

Nobody embodied that more than Sloth.

## Summary

Nashville improved to **2–0 with a 24–9 divisional victory over Richmond**, powered by another enormous performance from Koala, who rushed for **250 yards and three touchdowns on 31 carries** after producing 264 yards in Week 1. The Shock finished with 350 rushing yards and nine tackles for loss, while Sloth dominated defensively with 12 tackles and five stops behind the line. Richmond received 102 yards and a late touchdown from Baby but fell to **0–2**, while Nashville strengthened its early claim as one of the league''s top teams.', '2026-08-19T17:51:00Z', 1, NULL),
('2026-w13-g65-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '62e0ffac-9cd4-560d-9be2-6744f322bcd1', 'regular', 13, 'game_recap', 'published', 'Kiwi''s 200 Yards, Three Touchdowns Send Sacramento Past Milwaukee 36–21 and Into Playoffs', 'Kiwi rushes for 200 yards and three scores, while Micro and Streak connect for three touchdowns as Sacramento defeats Milwaukee 36–21, completes a three-game winning streak and clinches a top-six playoff berth at 7–6.', 'Sacramento entered the final week with its season on the line. It left with a playoff berth.

Kiwi rushed for **200 yards and three touchdowns**, Micro threw for **274 yards and three scores**, and the Gold Rush defeated the Milwaukee Forge **36–21** to finish the regular season at **7–6**, good for a place in the AFL''s six-team playoff field.

The result completed Sacramento''s second victory over Milwaukee in three weeks, following a **30–18 road win in Week 11**, and ended the Forge''s season at **5–7–1**.

For Sacramento, this wasn''t simply another division win. It was the culmination of a remarkable late-season recovery.

The Gold Rush entered at **6–6**, occupying fourth place by winning percentage in the league-wide standings, but only narrowly ahead of San Antonio (6–6), Richmond (6–7) and Milwaukee (5–6–1). With the top six advancing, Sacramento could remove all doubt by winning. Milwaukee, seventh entering the matchup, needed an upset to keep its hopes alive.

Sacramento made sure that didn''t happen.

## Sacramento Starts on the Ground

Milwaukee received the opening possession but punted after Woodstock''s third-down pass fell incomplete. Sacramento responded with a sustained march from its own 20, using Kiwi''s runs and completions to Moose and Streak to convert repeatedly.

Kiwi finished it from **7 yards out with 5:36 remaining in the first**, putting the Gold Rush ahead **6–0**.

Milwaukee moved the ball late in the quarter, including a 25-yard rush by Dog, but settled for a field goal early in the second. The Forge had cut the deficit to **6–3**, yet Sacramento answered immediately.

A 20-yard Kiwi run helped launch the drive, and Micro found Streak from **4 yards out** for a **12–3** advantage.

Milwaukee''s passing game finally found rhythm. Woodstock hit NS Bear for 23 yards and eventually found McJagger for a **10-yard touchdown**, narrowing the margin to **12–9**.

Sacramento''s most important first-half response came in the closing seconds. Kiwi plunged in from **1 yard out with 12 seconds remaining**, sending the Gold Rush to halftime up **18–9**.

## Milwaukee Threatens in the Third

An early third-quarter Woodstock pass intended for Dog was intercepted by Micro, but Sacramento couldn''t turn the takeaway into points. Milwaukee soon found its opening.

Trunky broke loose for 25 yards and then exploded for a **38-yard touchdown** with 11:31 left in the third quarter. The Forge had pulled within **18–15**, just one possession from overturning the game.

Sacramento answered before Milwaukee could seize the momentum.

Micro found Streak for a **17-yard touchdown with 5:18 remaining in the third**, restoring a nine-point advantage at **24–15**. It was the second touchdown connection between the pair, and it would not be their last.

## Streak Breaks the Game Open

The fourth quarter began with Sacramento still facing a dangerous opponent. Micro opened a scoring drive with a **21-yard completion to Moose**, then struck Streak for a **20-yard touchdown with 10:26 remaining**.

The Gold Rush had stretched the lead to **30–15**.

Streak finished with **nine catches for 116 yards and three touchdowns**, all from Micro. Moose was nearly as productive, catching **nine passes for 115 yards**, giving Sacramento two reliable receiving threats alongside its punishing ground game.

Milwaukee refused to disappear. Woodstock connected with McJagger for 24 yards and NS Bear for 28, then found McJagger again for a **4-yard touchdown with 5:38 remaining**.

At **30–21**, the Forge still needed a stop and a rapid finish.

They never got the stop.

Sacramento moved the ball downfield, drained the clock and handed Kiwi the opportunity to finish what he had started. With **1:43 remaining**, he broke away for a **24-yard touchdown**, his third of the evening.

**Sacramento 36, Milwaukee 21.** That was the final margin.

## The Playoff Picture

Sacramento entered Game 65 fourth overall at **6–6**, behind Nashville (9–1–3), Portland (8–3–2) and Charlotte (8–5). San Antonio also stood at 6–6, followed by Richmond at 6–7 and Milwaukee at 5–6–1.

With only six playoff berths available, the Gold Rush needed to keep clear of a dangerous cluster around the cut line. The win moved them to **7–6**, keeping them fourth in the overall standings and guaranteeing a top-six finish.

Milwaukee dropped to **5–7–1**, falling further below the cut line and out of playoff contention. The Forge had produced impressive wins over Charlotte and San Antonio and even tied Nashville earlier in the season, but Sacramento swept both head-to-head meetings when the postseason stakes were highest.

Sacramento''s path was hardly straightforward. The Gold Rush fell to **3–5** after a Week 8 loss to Tallahassee, stunned Portland **27–24** in Week 9, then suffered a **27–0 shutout against Richmond** in Week 10. At 4–6, the season was slipping away.

They responded with three straight wins: **30–18 over Milwaukee, 24–21 at Portland, and 36–21 over Milwaukee**.

Sacramento also finished with two wins against Portland, one of the league''s strongest clubs, demonstrating that its late surge was built on more than favorable opponents.

## Defining Play

Milwaukee had just cut Sacramento''s lead to **18–15** on Trunky''s 38-yard touchdown run early in the third quarter. The Forge finally had momentum, and the Gold Rush could no longer rely on the nine-point halftime cushion.

Micro''s **17-yard touchdown pass to Streak with 5:18 left in the third** restored a **24–15** lead and stopped the comeback from taking hold. When the same pairing connected for 20 more yards and another touchdown in the fourth, Milwaukee''s task became even more daunting.

The third-quarter score was the key answer when Sacramento most needed one.

## Offensive Player of the Game

**Kiwi, Sacramento Gold Rush**

Kiwi carried **30 times for 200 yards and three touchdowns**, adding **three receptions for 36 yards** and finishing with **236 yards from scrimmage**.

His touchdowns came from 7, 1 and 24 yards, reflecting three different roles: establishing the tone, finishing a crucial late-half drive and putting the game away in the final two minutes.

Micro''s **22-of-37 passing for 274 yards and three touchdowns** and Streak''s three touchdown receptions were outstanding, but Kiwi supplied the offensive foundation throughout the night.

## Summary

Sacramento completed a three-game winning streak and secured a top-six playoff position with a **36–21 victory** over Milwaukee. Kiwi delivered **200 rushing yards and three touchdowns**, while Micro and Streak connected for three passing scores. Milwaukee rallied to within **18–15** in the third, but Sacramento responded with two consecutive Streak touchdowns and Kiwi''s late 24-yard knockout blow. The Gold Rush finish **7–6** and head to the postseason; the Forge finish **5–7–1** and head home.', '2026-11-22T00:09:00Z', 1, NULL),
('2026-w13-g61-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'cefff00e-a0bc-58b7-8efb-abead6e86daf', 'regular', 13, 'game_recap', 'published', 'Nashville Survives Charlotte''s Furious Finish, 18–15, to Seal No. 1 Standing', 'Koala rushes for 116 yards, Barnsworth catches 126 yards and a score, and Nashville withstands Charlotte''s last-minute rally to finish 9–1–3, first in the AFL standings.', 'Nashville''s regular-season finale had all the tension of a playoff game. The Shock overcame a halftime deficit, made a crucial goal-line stand and survived Charlotte''s frantic final possession to win **18–15**, finishing **9–1–3** atop the ten-team AFL.

The Kingsmen entered **8–4 and second overall**, immediately behind Nashville''s **8–1–3**. Both were comfortably inside the top-six playoff field, but seeding and momentum mattered. Nashville had beaten Charlotte **24–12 in Week 5**, giving this divisional rematch plenty of context. The Shock completed the season sweep; Charlotte fell to **8–5** and ultimately third overall after Portland''s victory later in Week 13.

## Nashville Settles for Threes

Charlotte''s early passing attack looked promising when Tweety found Tigger for **23 yards**, but an attempted throw to Jimbo was intercepted by Mini. Nashville converted the opportunity into a field goal with **8:59 remaining in the first**.

The Kingsmen answered with a field goal of their own at **6:10**, tying it **3–3**. Nashville moved downfield again but stalled near the end zone, adding another kick with **56 seconds left in the quarter** for a **6–3 lead**.

The Shock had moved the ball but left points available. Charlotte made them pay in the second quarter. With **9:25 before halftime**, Tweety found Lil Slushie for an **8-yard touchdown**, putting the Kingsmen ahead **9–6**.

Leon Gory connected with Barnsworth for **24 yards** late in the half, but Nashville did not convert the possession into points. Charlotte took its three-point lead to the locker room.

## Koala and the Goal-Line Stand

Nashville returned to its running identity in the third. Koala finished a march with a **1-yard touchdown with 8:14 remaining**, restoring a **12–9** lead. He would finish with **116 yards and a touchdown on 32 carries**.

The fourth quarter supplied the game''s most consequential defensive moment. Charlotte drove to the Nashville 1 and faced **fourth-and-1** with the Shock still leading by three. Rather than kick to tie, the Kingsmen went for the touchdown.

Rat took the handoff and lost **three yards**. Charlotte''s best opportunity to seize control disappeared on a turnover on downs.

The Shock finally got separation with **3:36 remaining**, when Leon Gory found Barnsworth for a **7-yard touchdown** and an **18–9** lead. Barnsworth finished with **nine receptions for 126 yards and a score**; Leon Gory threw for **196 yards on 16-of-27 passing**.

## One Final Charlotte Charge

Charlotte refused to go quietly. Tweety hit Tigger on completions of **14 and 21 yards**, then Lil Slushie for **14 more**, before finding Jimbo on a **4-yard touchdown** with **1:59 left**. Nashville''s advantage was suddenly **18–15**.

The Kingsmen got one final possession after Nashville punted with **54 seconds remaining**. Tweety was sacked for seven yards, completed a 13-yard pass to Jimbo, then absorbed another six-yard sack. On **fourth-and-10 with 15 seconds showing**, he found Lil Slushie for **22 yards** to keep the season-ending threat alive. His final pass was incomplete with three seconds left in the play history.

Tweety finished **25-of-51 for 289 yards**, with two touchdown passes and an interception. Tigger led Charlotte with **nine catches for 126 yards**, and Jimbo added **seven catches, 77 yards and a touchdown**. The production was substantial, but the Kingsmen could not make enough of their chances count.

## Playoff Implications

Nashville retains **first overall at 9–1–3**, a powerful position in the six-team postseason. Charlotte drops to **8–5**, ultimately third after Portland overtakes it by winning percentage. The Kingsmen still qualify, but head into the playoffs after back-to-back defeats.

The difference was situational execution. Nashville had only 18 points and allowed a late touchdown, yet its defenders forced damaging losses. Barnsworth registered **five tackles for loss** in the play log, and Ernie added three. The fourth-and-1 stop at the 1-yard line was the clearest illustration.

## Defining Play

**Charlotte''s fourth-and-1 attempt at the Nashville 1 early in the fourth quarter.** Trailing only **12–9**, the Kingsmen chose to go for the lead. Rat lost three yards, preserving Nashville''s advantage and setting up the Shock''s eventual game-separating touchdown.

## Offensive Player of the Game

**Barnsworth, Nashville Shock.** Nine catches for **126 yards and the decisive fourth-quarter touchdown** gave Leon Gory his most reliable target. Koala''s 116 rushing yards were vital, but Barnsworth''s late score supplied the margin Nashville needed.

## Defensive Player of the Game

**Barnsworth, Nashville Shock.** The play history credits him with **five tackles for loss**, repeatedly disrupting an aggressive Charlotte offense in critical situations.

## Summary

Nashville defeats Charlotte **18–15**, overcoming a 9–6 halftime deficit and stopping a fourth-and-1 run at its own goal line. The Shock finish **9–1–3 and first overall**; the Kingsmen close **8–5 and third**, both advancing to the AFL''s six-team playoffs.', '2026-11-22T00:15:00Z', 1, NULL),
('2026-w13-g62-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'cf333c88-70e8-5e87-a871-561d60679577', 'regular', 13, 'game_recap', 'published', 'Columbus Stuns Richmond 24–21 on Last-Second Kick, Upending Playoff Race', 'A field goal with five seconds left gives Columbus a 24–21 win over Richmond. PullFrog posts 136 receiving yards and two touchdowns; Richmond falls from fourth to sixth in the tight top-six playoff picture.', 'Richmond''s playoff race took a painful turn at home. The Rebellion had climbed into fourth place entering their Week 13 finale, but Columbus spent the closing seven minutes holding the ball and kicked a **game-winning field goal with five seconds remaining** to steal a **24–21** victory.

The Talons finish **5–8** while Richmond closes **6–7**, sliding into the sixth and final playoff position pending the unfinished Tallahassee–San Antonio matchup. The defeat was especially frustrating because Columbus had already beaten Richmond **21–18 in Week 9**. The Talons won both divisional meetings by three.

## Columbus Lands the First Blow

Marine Bear opened aggressively, including a **21-yard completion to NL Bear** on third down, but the Talons initially came up empty. Richmond then gambled on **fourth-and-6 near midfield**; John''s throw toward Brownie was incomplete, handing Columbus favorable field position.

Columbus converted the opportunity into a field goal with **3:54 remaining in the first**, taking a **3–0 lead**.

Richmond responded through the air. John hit Brownie for **30 yards** to set up a promising possession, then the Rebellion made their own fourth-down gamble count. At the Columbus 1, **Baby gained exactly one yard on fourth-and-1** for a touchdown with **13:16 left in the second**. Richmond led **6–3**.

Columbus answered by feeding Black Dog, who finished a scoring drive from **six yards out** with **4:56 before halftime**. The Talons reclaimed the lead **9–6**, setting the tone for the half''s repeated momentum swings.

## Lead Changes in the Third

Baby returned to the end zone on a **4-yard run with 13:46 left in the third**, pushing Richmond ahead **12–9**. But Columbus was ready with an immediate response.

Marine Bear found PullFrog for a key **22-yard gain** and then connected again for a **10-yard touchdown at 11:54**. Columbus led **15–12**.

Richmond responded with a field goal at **5:44**, restoring a **15–15** tie. Every score seemed to demand an immediate answer, and neither defense could completely settle the game.

Early in the fourth, the Marine Bear–PullFrog partnership struck again. A **17-yard touchdown pass with 11:43 left** gave Columbus a **21–15 advantage**.

John refused to let Richmond''s season end quietly. With **7:13 remaining**, he found Brownie for a **24-yard touchdown**, tying it **21–21**. John finished **20-of-34 for 271 passing yards**; Brownie caught **seven passes for 125 yards and a touchdown**.

Then the Rebellion defense needed one stop.

## The Talons Own the Final Seven Minutes

Columbus took over with **7:08 left** and put the game in EMC''s hands. Facing **fourth-and-1 with 5:12 remaining**, the Talons kept their offense on the field. EMC gained two yards.

They faced **fourth-and-1 again with 3:13 left**. EMC gained the yard needed.

The conversions denied Richmond precious possessions. Marine Bear found NL Bear for **15 yards**, and EMC ran for **10 yards with 1:06 left**, then another **10 yards with 28 seconds remaining**. A late sack pushed the Talons backward, but they stayed within kicking range.

With **five seconds showing**, Columbus converted a field goal to make it **24–21**.

Richmond had no time to respond.

## What the Loss Means

Richmond entered **6–6 and fourth overall** in a league where only **six of ten teams qualify**. The loss left it **6–7 and sixth** after the completed games, creating a nervous wait for the Tallahassee–San Antonio finale to establish the remaining ordering around the cutoff.

Columbus moved from **4–8 to 5–8**, up to eighth but still outside the playoff field. The Talons'' late-season success against Richmond will linger as one of the strange stories of an otherwise disappointing year: they swept a playoff contender while winning only five times overall.

Marine Bear finished **20-of-37 for 250 yards and two touchdown passes**. PullFrog was the primary mismatch with **11 catches for 136 yards and two touchdowns**. Ralph also supplied **11 catches for 127 yards**, giving the Talons a second consistently productive target.

On the ground, EMC gained **74 yards on 18 carries**, while Black Dog added **67 on 22 carries and a touchdown**.

Richmond got **two rushing touchdowns from Baby**, who finished with **59 yards on 19 carries**, and **74 rushing yards on 18 carries from EMC''s opposite-side counterpart** was part of the story of Columbus controlling late downs. The Rebellion''s offensive production was enough to reach 21 points, but not enough to reclaim the ball in time.

## Defining Play

**Columbus'' second fourth-and-1 conversion, with 3:13 remaining in a 21–21 game.** EMC gained a yard to keep the ball away from Richmond, allowing the Talons to continue their field-goal drive and consume the remaining clock.

## Offensive Player of the Game

**PullFrog, Columbus Talons.** Eleven receptions for **136 yards and two touchdowns**, with both scores following Richmond attempts to seize momentum. The Rebellion repeatedly had the lead or an opportunity to take it, only for PullFrog to deliver.

## Defensive Player of the Game

**EMC, Columbus Talons.** The play log credits EMC with **three tackles for loss** in addition to his productive two-way workload. His consecutive late fourth-down conversions made the winning drive possible.

## Summary

Columbus sweeps Richmond''s season series with a **24–21 road victory**, decided by a field goal with five seconds remaining. Marine Bear passes for 250 yards, PullFrog catches 136 and two scores, and EMC powers the final drive. Richmond finishes **6–7**, anxiously holding the sixth playoff position as the Week 13 slate concludes.', '2026-11-22T00:15:00Z', 1, NULL),
('2026-w13-g64-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '41a0c351-5b43-533b-9851-0ef3a7ca279f', 'regular', 13, 'game_recap', 'published', 'Ezekiel''s Three Scores Power Portland Past Albuquerque 30–12, Locking Up No. 2', 'Portland races to a 30–0 lead behind Ezekiel''s 191 rushing yards and three total touchdowns, beating Albuquerque 30–12. Portland finishes 8–3–2 in second; the Vortex close 1–9–3.', 'Portland made the final regular-season game look like a playoff tune-up for three quarters, building a **30–0 lead** before allowing two late Albuquerque touchdowns in a **30–12 Wildfire victory**.

Ezekiel rushed for **191 yards and two touchdowns**, caught another score, and helped Portland finish **8–3–2 and second overall** in the AFL''s six-team playoff picture. Albuquerque closed **1–9–3 and tenth**, ending a difficult season without a postseason berth.

It was also the emphatic answer Portland needed after the teams'' **33–33 tie in Week 10**. Albuquerque had shown it could keep pace with one of the league''s best; the rematch removed the doubt.

## Three Carries, One Touchdown

Albuquerque''s first drive began with an **11-yard Ming run**, but RBI Bear absorbed back-to-back sacks and the Vortex punted.

Portland took over on its own 28 and called Ezekiel''s number three straight times. He gained **23 yards**, then **10**, then raced **39 yards for a touchdown with 11:33 remaining**.

Three carries. Seventy-two yards. Six points.

Albuquerque''s next possession also stalled, and Portland again leaned on the ground game. The Wildfire eventually switched to the air at the goal line: C Monster found **Ezekiel for a 4-yard touchdown with 2:07 remaining in the first**.

**Portland 12, Albuquerque 0.**

The rematch already had a very different feel from the October tie.

## Fourth-Down Power

The Wildfire continued attacking behind Ezekiel and Big Boy. Facing **fourth-and-1 during a second-quarter march**, Portland turned to Big Boy, who broke free for **21 yards** and a first down.

A few snaps later, Ezekiel scored on a **6-yard fourth-and-3 run with 8:20 left in the half**. Portland''s lead ballooned to **18–0**.

Albuquerque had little response. RBI Bear''s offense struggled with sacks and unsuccessful third downs, and a fourth-down run by the quarterback gained only one yard when the Vortex needed eight.

Portland capitalized on the defensive stop by grinding downfield. Ezekiel broke another **20-yard run**, setting up a field goal with **five seconds left in the half**.

**Halftime: Portland 21, Albuquerque 0.**

In a contest against a Vortex team that had tied them just three weeks earlier, the Wildfire had established total control.

## Portland Reaches Thirty Before Albuquerque Responds

The third quarter followed the same pattern. Portland added a field goal with **6:32 remaining**, pushing the lead to **24–0**.

Big Boy then supplied another explosive rush, gaining **26 yards** to set up the goal line. On the first play of the fourth quarter, he scored from **one yard out**.

**Portland 30, Albuquerque 0.**

Ezekiel and Big Boy combined for **296 rushing yards on 43 carries**, an overwhelming workload that forced Albuquerque''s defense to tackle almost continuously. Hippo added **42 yards on nine attempts**, making Portland''s rushing advantage broader than a single exceptional player.

Only with the game out of reach did Albuquerque begin to find the end zone.

RBI Bear connected with Rolf for a **13-yard touchdown with 8:19 remaining**, cutting the deficit to **30–6**. Later, with **1:43 left**, RBI Bear scored himself on a **1-yard quarterback run**.

The comeback made the final score **30–12**, but the Vortex never seriously threatened the outcome after trailing by thirty.

RBI Bear completed **19 of 44 attempts for 213 yards**. Skunkers had **eight receptions for 89 yards**; Rolf added **eight catches for 86 yards and a touchdown**.

## A Familiar Identity for a Playoff Team

Portland''s offense was unapologetically run-heavy. Ezekiel finished with **26 carries for 191 yards and two rushing touchdowns**, plus **two catches for 10 yards and a receiving touchdown**. That is **201 yards from scrimmage and three total scores**.

Big Boy ran **17 times for 105 yards and a touchdown**. C Monster threw only **15 passes**, completing seven for **71 yards and a score**. Portland simply did not need more through the air.

The defense complemented that formula with aggressive backfield play. Frog was credited with **five tackles for loss**, and Wasabi added two. Albuquerque was forced to operate behind the chains repeatedly, explaining the three scoreless quarters more clearly than the late touchdowns did.

## Playoff Implications

Portland entered Week 13 **7–3–2 and second overall** behind Nashville. Charlotte''s loss earlier in the week opened breathing room, and Portland''s victory pushed the Wildfire to **8–3–2**, locking them into second by winning percentage among the completed results.

The Wildfire have a credible title-contending resume, including a win over Nashville. Yet their two late-season losses to Sacramento remain a warning about the volatility of postseason matchups. Against Albuquerque, Portland looked like the dominant running team that opened the year.

The Vortex finish **1–9–3**, their draw against Portland in Week 10 standing out as a missed chance to build something more substantial.

## Defining Play

With Portland already leading **12–0**, Big Boy converted **fourth-and-1 for 21 yards** in the second quarter. The possession stayed alive, and Ezekiel later converted **fourth-and-3 from six yards out for a touchdown**, making it **18–0**.

The sequence proved Albuquerque could not count on favorable down and distance to get the Wildfire off the field.

## Offensive Player of the Game

**Ezekiel, Portland Wildfire.** He rushed for **191 yards and two touchdowns**, caught another touchdown and amassed **201 total yards from scrimmage**. His 39-yard touchdown on the first drive set the tone, and his three total scores made him the clearest difference-maker.

## Defensive Player of the Game

**Frog, Portland Wildfire.** Five tackles for loss in the play history, contributing to a defensive effort that kept Albuquerque scoreless until the fourth quarter.

## Summary

Portland defeats Albuquerque **30–12**, riding Ezekiel''s 191 rushing yards and three total touchdowns alongside Big Boy''s 105 rushing yards. The Wildfire finish **8–3–2 and second overall**, while the Vortex close **1–9–3 and tenth**.', '2026-11-22T00:15:00Z', 1, NULL),
('2026-mvp-rankings', '97808f43-a0d5-5251-bf8d-fae1643c8258', NULL, 'regular', 13, 'mvp_rankings', 'published', 'The AFL MVP Race: Eight Stars, One Award, and a Battle Between Greatness and Winning', 'A top-eight AFL MVP ballot led by Nashville''s Koala over Portland''s Ezekiel, weighing season production, team success, defensive contributions and defining MVP moments.', '# The AFL MVP Race: Eight Stars, One Award, and a Battle Between Greatness and Winning

*The regular season has produced historic individual performances, extraordinary two-way players, and a handful of stars who have almost single-handedly carried their teams into postseason contention. But who deserves to be called the league''s most valuable player?*

With the AFL regular season nearly complete, the MVP conversation has become a fascinating debate over what the award should actually recognize. Should it go to the player with the most overwhelming statistical production? The quarterback responsible for nearly every touchdown his team scores? Or the centerpiece of the league''s most successful franchise?

This year''s ballot considers three factors: **individual production, importance to team success, and performance in defining moments.** Winning matters, but it isn''t everything. Defensive contributions deserve serious recognition, particularly in a league where several players contribute on both sides of the football. With four Week 13 games completed and Tallahassee–San Antonio still awaiting a final result, here are the eight players who have made the strongest cases for the AFL''s most prestigious individual award.

## 8. <img src="https://andrew-jacobson06.github.io/public-audio/wildfire.png" alt="Portland Wildfire logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Frog — Portland Wildfire | K / Defensive Front

**Season stats:** 68 tackles | 32 tackles for loss | 7 sacks | 1 safety forced | 518 defensive line matchup wins | 426 offensive line matchup wins

The MVP conversation usually begins with running backs and quarterbacks, but Frog has produced a season that demands recognition. Portland''s versatile, roster-listed kicker has been an absolute menace in the trenches, leading the league with **32 tackles for loss and seven sacks**. His 518 defensive line matchup victories are also the league''s highest total. This isn''t merely a defender accumulating tackles after opponents cross the line of scrimmage; Frog is consistently preventing them from getting there in the first place.

What elevates his candidacy is his involvement on both sides of the ball. Frog has contributed 426 offensive line matchup victories while helping anchor a Portland team that finishes **8–3–2**, second in the overall standings. He ranks eighth because MVP-level disruption from a nontraditional position is difficult to measure against players who directly account for thousands of yards and multiple touchdowns each week. Still, a league-leading defensive season on one of the AFL''s best teams deserves a place on the ballot.

**MVP Moment — Week 13 vs. Albuquerque:** With Portland looking to secure its postseason position, Frog registered **five tackles for loss** as the Wildfire built a 30–0 lead before cruising to a 30–12 victory. It was the perfect illustration of his season: consistently destroying possessions before they had an opportunity to develop.

## 7. <img src="https://andrew-jacobson06.github.io/public-audio/outlaw.png" alt="San Antonio Outlaws logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Luke — San Antonio Outlaws | RB

**Season stats:** 288 carries | 1,526 rushing yards | 9 rushing TD | 49 receptions | 549 receiving yards | 2 receiving TD | 2,075 yards from scrimmage | 11 total TD

Luke has been one of the league''s most complete offensive weapons from the opening week. His 1,526 rushing yards rank third in the AFL, but focusing exclusively on his rushing production undersells what he brings to San Antonio. His 549 receiving yards make him a legitimate threat regardless of how the Outlaws get him the football. Only three players have surpassed 2,000 yards from scrimmage, and Luke has accomplished it while averaging **5.3 yards per carry** and avoiding a single recorded fumble.

The challenge for Luke''s MVP case is the Outlaws'' record. San Antonio stands at **6–6 with its final game still unfinished**, leaving the team fighting for position around the playoff cutoff rather than competing for the league''s top seed. Luke has been remarkably consistent and indispensable, but his eleven touchdowns trail several other candidates, and his team''s uneven results make it difficult to push him into the upper tier. An explosive, multifaceted season earns him seventh.

**MVP Moment — Week 1 vs. Sacramento:** Luke announced himself immediately with a **73-yard touchdown run** in San Antonio''s 27–15 opening victory over the Gold Rush. It was a statement about the game-breaking speed that would make him one of the AFL''s most productive all-purpose backs throughout the season.

## 6. <img src="https://andrew-jacobson06.github.io/public-audio/rebel.png" alt="Richmond Rebellion logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Baby — Richmond Rebellion | RB

**Season stats:** 327 carries | 1,492 rushing yards | 15 rushing TD | 46 receptions | 422 receiving yards | 3 receiving TD | 1,914 yards from scrimmage | 18 total TD | 130 tackles | 9 TFL | 3 sacks | 2 forced fumbles

There may not be a more physically demanding individual season anywhere in the AFL than the one Baby has delivered for Richmond. His offensive numbers alone would merit consideration: nearly 1,500 rushing yards, more than 400 receiving yards and 18 touchdowns. But those figures tell only part of the story. Baby has also recorded **130 tackles, nine tackles for loss, three sacks and two forced fumbles**. He is simultaneously one of Richmond''s most important offensive weapons and one of its most active defenders.

That''s what makes Baby such an interesting MVP candidate. His production isn''t concentrated in one role, and his impact isn''t limited to the scoreboard. He has repeatedly kept Richmond competitive while absorbing an enormous workload. Unfortunately, the Rebellion''s **6–7 finish** creates a ceiling for his candidacy, particularly after a heartbreaking Week 13 loss to Columbus left their playoff position precarious. Had Richmond converted another one or two close games into victories, Baby could easily be approaching the top three. Instead, his exceptional two-way season lands sixth.

**MVP Moment — Week 12 vs. Charlotte:** Facing one of the league''s strongest teams with Richmond''s postseason hopes on the line, Baby delivered **165 rushing yards, 45 receiving yards and two rushing touchdowns** in a 30–18 victory over the Kingsmen. His 210 yards from scrimmage helped Richmond secure one of its most consequential wins of the season.

## 5. <img src="https://andrew-jacobson06.github.io/public-audio/wildfire.png" alt="Portland Wildfire logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> C Monster — Portland Wildfire | QB

**Season stats:** 136/236 passing | 1,667 passing yards | 14 passing TD | 63 rushing yards | 1 rushing TD | 62 tackles | 28 TFL | 5 sacks | 426 defensive line matchup wins | 263 offensive line matchup wins

C Monster''s candidacy might be the hardest to evaluate in conventional football terms. As Portland''s quarterback, he has not produced passing statistics remotely comparable to the AFL''s most prolific quarterbacks. His 1,667 yards and 14 passing touchdowns are modest beside the numbers of Tweety or Micro. But evaluating him exclusively as a quarterback ignores a remarkable defensive season: **28 tackles for loss and five sacks**, alongside an enormous number of offensive and defensive line matchup wins.

C Monster is effectively contributing to Portland''s success in multiple phases of the game. He directs an offense built around Ezekiel, makes enough throws to punish defenses that overcommit to stopping the run, and provides disruptive defensive production that most quarterbacks simply don''t offer. Portland''s second-place finish gives those contributions additional weight. His lower passing volume and two lost fumbles prevent him from joining the leading MVP candidates, but his overall impact on a championship contender is substantial enough for fifth.

**MVP Moment — Week 8 vs. Nashville:** Against the eventual league leaders, C Monster delivered **216 passing yards and a 15-yard touchdown to Hippo** in Portland''s 21–15 victory. The Wildfire handed Nashville its only loss of the regular season, and C Monster''s performance helped prove Portland could beat an elite opponent with more than Ezekiel''s rushing alone.

## 4. <img src="https://andrew-jacobson06.github.io/public-audio/kingsmen.png" alt="Charlotte Kingsmen logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Tweety — Charlotte Kingsmen | QB

**Season stats:** 255/429 passing | 3,055 passing yards | 25 passing TD | 111 carries | 575 rushing yards | 6 rushing TD | 3,630 combined passing and rushing yards | 31 total TD

There is a strong argument that Tweety has been the league''s most dangerous dual-threat quarterback. He leads all quarterbacks on winning teams in passing yardage, ranks near the top in touchdown production, and has generated another 575 yards on the ground. His **31 combined touchdowns** are particularly impressive considering how frequently Charlotte asks him to create something beyond the structure of the passing game. When the Kingsmen are at their best, Tweety can beat a defense with his arm, his legs or both on the same possession.

Charlotte''s **8–5 record** is a major asset for his candidacy, but the timing of its losses matters. The Kingsmen entered Week 12 at 8–3 and positioned to challenge for one of the league''s highest playoff seeds. Consecutive losses to Richmond and Nashville have cooled both the team''s momentum and Tweety''s MVP case. He still ranks above the other quarterbacks outside the top three because his statistical production is outstanding and his team has consistently competed near the top of the standings. But his late-season stumble creates enough separation between him and the final three candidates.

**MVP Moment — Week 9 vs. Tallahassee:** Tweety completed **30 of 42 passes for 320 yards and four touchdowns** in Charlotte''s 30–18 victory over the Makos. His 26-yard touchdown pass to Tigger in the fourth quarter helped put the game out of reach, showcasing the passing efficiency and explosiveness that drove Charlotte''s rise into the league''s upper tier.

## 3. <img src="https://andrew-jacobson06.github.io/public-audio/rush.png" alt="Sacramento Gold Rush logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Micro — Sacramento Gold Rush | QB

**Season stats:** 220/393 passing | 2,689 passing yards | 24 passing TD | 113 carries | 509 rushing yards | 8 rushing TD | 3,198 combined passing and rushing yards | 32 total TD

No player has done more to change the direction of his team''s season over the final month than Micro. Sacramento was **3–5 after Week 8**, seemingly headed toward a disappointing finish. A stunning victory over Portland briefly revived hope, but a 27–0 shutout against Richmond left the Gold Rush at 4–6. What followed was one of the league''s most impressive late-season runs: three straight victories to finish **7–6**, clinching a top-six playoff berth. Micro was at the center of that recovery.

His 32 combined touchdowns trail only RBI Bear''s total among the quarterbacks in the season data, and his 509 rushing yards give Sacramento another dimension that defenses must account for. More importantly, his production has translated into wins against meaningful competition. Sacramento swept Portland during the regular season and defeated Milwaukee twice in the final three weeks. Micro''s candidacy is about more than the numbers; it''s about the difference between a team drifting toward elimination and one nobody should want to face in the playoffs. His only real weakness is that Sacramento''s 7–6 record doesn''t match the elite consistency of the two teams represented above him.

**MVP Moment — Week 13 vs. Milwaukee:** With Sacramento''s playoff berth at stake, Micro completed **22 of 37 passes for 274 yards and three touchdowns**, all to Streak, in a 36–21 victory. Milwaukee had pulled within 18–15 in the third quarter, but Micro responded with a 17-yard touchdown to Streak and added another 20-yard scoring connection in the fourth. The performance capped Sacramento''s three-game winning streak and secured its postseason place.

## 2. <img src="https://andrew-jacobson06.github.io/public-audio/wildfire.png" alt="Portland Wildfire logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Ezekiel — Portland Wildfire | RB

**Season stats:** 365 carries | 2,412 rushing yards | 18 rushing TD | 24 receptions | 271 receiving yards | 1 receiving TD | 2,683 yards from scrimmage | 19 total TD | 6.61 yards per carry | 0 fumbles

If the AFL MVP award were decided solely on individual dominance, Ezekiel would win it. His **2,412 rushing yards** are the highest total in the league by more than 300 yards, and his 6.61 yards per carry is extraordinary for a player who has handled 365 rushing attempts. He has produced 29 runs of at least 20 yards, including five runs of 50 or more, without fumbling once. He isn''t simply the most productive runner in the league; he is its most explosive offensive weapon, capable of turning a routine possession into six points on almost any snap.

Portland''s **8–3–2 record and second-place finish** strengthen his case considerably. The Wildfire have built their offensive identity around Ezekiel, and he has justified that trust with one remarkable performance after another. The argument against him is surprisingly narrow: Nashville finished ahead of Portland, and Koala delivered more touchdowns and a larger volume of drive-sustaining rushing production. Ezekiel has the advantage in yardage, efficiency and explosiveness. Koala has the advantage in touchdowns and overall team success. It''s an exceptionally close decision, but Ezekiel finishes second on this ballot.

**MVP Moment — Week 1 vs. Charlotte:** In the season opener, Ezekiel rushed for an astonishing **301 yards and three touchdowns on 33 carries**, including two separate **71-yard touchdown runs**, as Portland defeated Charlotte 18–12. It remains perhaps the single most breathtaking individual offensive performance of the AFL season. Two of his touchdowns came on nearly identical breakaway runs, and all three Portland touchdowns came from him. It was the kind of performance that established an MVP candidacy before most of the league had even completed its first game.

## 1. <img src="https://andrew-jacobson06.github.io/public-audio/shock.png" alt="Nashville Shock logo" width="32" height="32" style="vertical-align:middle; object-fit:contain;" /> Koala — Nashville Shock | RB

**Season stats:** 403 carries | 2,093 rushing yards | 21 rushing TD | 18 receptions | 142 receiving yards | 2 receiving TD | 2,235 yards from scrimmage | 23 total TD | 134 rushing first downs | 41 broken tackles

Koala may not lead the league in rushing yards, but he leads the league''s best team in the category that matters most: making an offense work. Nashville finishes **9–1–3**, first in the AFL, and Koala has been its offensive foundation from opening week through the regular-season finale. His 403 carries and 134 rushing first downs show how thoroughly the Shock have relied on him. He has scored **23 touchdowns**, more than any other non-quarterback on this ballot, and has consistently created positive gains when Nashville needed to extend possessions, preserve leads or finish drives. While Ezekiel can change a game in one play, Koala has repeatedly demonstrated the ability to control an entire game.

The most compelling argument for Koala is the relationship between his performance and Nashville''s extraordinary consistency. The Shock have lost only once in thirteen games, and that defeat came against Portland, the team led by his closest MVP competitor. Koala''s production has given Nashville an identity built around possession, efficiency and physical control. He isn''t as explosive as Ezekiel, and his 5.19 yards per carry are less eye-catching, but his combination of **2,235 yards from scrimmage, 23 touchdowns and first-place team success** represents the strongest overall MVP case. The award isn''t for the league''s best statistical season. It''s for its most valuable player. This year, that distinction belongs to Koala.

**MVP Moment — Week 1 vs. Columbus:** Koala began the season with **264 rushing yards and a touchdown on 41 carries** in Nashville''s 21–6 victory. It wasn''t defined by one enormous run; his longest gained 26 yards. Instead, he produced 15 rushing first downs, repeatedly moved the chains and dictated the pace of the entire game. That performance established the blueprint Nashville would follow all season: give Koala the football, trust him to control the game, and force opponents to beat the Shock on Nashville''s terms.

---

## The Verdict: Dominance vs. Value

The 2026 AFL MVP race ultimately comes down to two extraordinary running backs who have dominated in very different ways. Ezekiel has delivered the most spectacular statistical season, accumulating 2,683 yards from scrimmage and producing explosive plays at a rate nobody else can match. If voters prioritize individual excellence above everything else, he is an entirely defensible choice. Micro''s late-season heroics, Tweety''s dual-threat production, and the remarkable two-way contributions of Baby and C Monster demonstrate just how strong and varied this year''s field has been.

But **Koala is my pick for AFL Most Valuable Player**. His 23 touchdowns, 134 rushing first downs and massive workload have been instrumental in Nashville finishing atop the standings with only one loss. The award should recognize the player whose contributions are most closely tied to sustained team success, and no candidate combines production, reliability and winning quite like Koala. Ezekiel may have produced the better highlight reel, but Koala has authored the most convincing MVP season.', '2026-11-22T00:31:09.694Z', 1, NULL),
('2026-playoffs-g66-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '60f31902-6756-5988-8061-0eb40f926984', 'Divisionals', NULL, 'game_recap', 'published', 'Nathan''s Two Touchdowns, San Antonio''s Late Stand End Sacramento''s Run, 21–18', 'San Antonio rallies from a 12–6 halftime deficit behind two Olaf-to-Nathan touchdowns, then runs out the clock after Sacramento cuts it to three. The Outlaws eliminate the Gold Rush 21–18 and advance to face Portland.', 'San Antonio had beaten Sacramento twice during the regular season, but the third meeting demanded a different kind of performance. The Outlaws trailed at halftime, lost a lead they had built in the first quarter, and faced a late Gold Rush comeback. They still found a way to make it three wins in three meetings.

Olaf threw two second-half touchdowns to Nathan, Luke provided 135 yards from scrimmage, and San Antonio survived **21–18** in the opening round of the AFL playoffs. The Outlaws advance to visit Portland in the West Division Championship. Sacramento''s remarkable late-season revival ends one game after it earned a postseason berth.

The teams entered the playoffs with identical **7–6 regular-season records**, but their head-to-head history belonged to San Antonio: a 27–15 victory in Week 1 and a 27–24 win in Week 4. The Gold Rush arrived on a three-game winning streak, while the Outlaws were coming off a 15–12 win at Tallahassee in their regular-season finale. Something had to give.

## Luke Starts the Scoring

Neither club had the luxury of easing into the game. San Antonio opened the scoring with a methodical first-quarter possession, leaning on Luke before he finished the drive from **1 yard out with 6:49 remaining**. The touchdown made it **6–0**, and it looked briefly as though the Outlaws would dictate the game with their ground attack.

But Sacramento had a quarterback capable of changing the rhythm. Micro, who had produced 32 combined touchdowns during the regular season, began working the ball to Moose and Streak. San Antonio''s defense kept the Gold Rush off the board for the rest of the first quarter, but the passing game was gradually finding room.

That room became six points in the second. Micro connected with **Moose for a 4-yard touchdown at 8:20**, tying the game **6–6**. The Gold Rush then produced the most important offensive sequence of their half: another drive ending with Moose in the end zone, this time on a **7-yard touchdown pass from Micro with 22 seconds remaining**.

Sacramento went to halftime ahead **12–6**. The underdog had scored twice through the air, and San Antonio''s early advantage had disappeared.

## Nathan Changes the Game

San Antonio needed to adjust. Sacramento was slowing the Outlaws'' rushing attack enough to make the game uncomfortable, and another scoreless quarter might have put the home team in serious danger.

The answer came from **Nathan**. On third-and-11 in the third quarter, Olaf found him for an **11-yard first down**. A few plays later, on second-and-8, the quarterback returned to the same target for a **27-yard touchdown with 8:21 remaining**.

The score tied the game **12–12**, but the drive''s importance was larger than six points. San Antonio had finally forced Sacramento to respect a passing threat beyond the rushing game.

The Gold Rush also missed an opportunity to increase their lead earlier in the quarter. Facing **fourth-and-1**, Sacramento ran Kiwi, who was stopped for a **2-yard loss**. The turnover on downs denied the visitors a continuation drive while protecting San Antonio''s comeback opportunity.

The score remained tied entering the fourth quarter. With the season on the line, the next successful possession could decide who would face Portland.

## The Outlaws Seize Control

San Antonio broke the tie with a **field goal at 12:45 of the fourth**, reclaiming a **15–12** lead. But a field goal alone could not make the finish comfortable, especially against a Sacramento offense that had rallied repeatedly down the stretch.

The next decisive connection again came between Olaf and Nathan.

With **8:39 remaining**, Olaf found Nathan for an **8-yard touchdown**, extending San Antonio''s lead to **21–12**. Nathan finished the game with **seven catches for 103 yards and two touchdowns**, turning what had been a difficult evening into a winning one for the Outlaws.

Olaf''s final line was **16 completions on 28 attempts for 183 yards and two touchdowns**. Those numbers won''t overwhelm a box score, but both scoring passes arrived when his team needed them most.

Sacramento answered with urgency. Micro kept the offense moving, and Streak continued to stretch the chains. The Gold Rush reached the goal line, where Kiwi scored from **2 yards out with 3:17 remaining** to cut the deficit to **21–18**.

For a moment, it looked as though Sacramento might get a final possession with the chance to tie or win.

San Antonio refused to surrender the ball.

## One Last First Down

Luke gained **3 yards**, then **7 more for a first down**, keeping the clock moving. Another seven-yard gain created a manageable situation, but after the next rush yielded only one yard, the Outlaws faced **third-and-2** with the game still hanging in the balance.

Instead of giving Sacramento a chance to get the ball back, San Antonio handed it to **Bobo**. He broke through for **14 yards**, the first down that effectively ended the Gold Rush''s season. The Outlaws then kneeled out the clock.

**Final: San Antonio 21, Sacramento 18.**

Luke finished with **97 yards and a touchdown on 28 carries**, plus **four catches for 38 yards**. It was not a spectacular rushing night by his standards, but his late first down helped secure the result.

Sacramento''s Micro completed **23 of 38 passes for 216 yards and two touchdowns**, adding **22 rushing yards**. Moose caught **10 passes for 65 yards and both Sacramento passing touchdowns**, while Streak produced **10 catches for 133 yards**. Yet the Gold Rush''s running game was contained: Kiwi managed **35 yards on 14 carries**, despite scoring the late touchdown.

San Antonio''s defense did the hardest work. Fuzz was credited in the play history with **seven tackles for loss** and a sack, repeatedly forcing Sacramento to fight through long-yardage situations. That disruption gave the offense just enough opportunities to turn the game.

## What It Means

San Antonio moves on to the **West Division Championship at Portland**, a matchup with a compelling recent history. The Outlaws lost **41–24** at Portland in Week 3 but won the rematch **24–15** at home in Week 11. One more victory would send them to the national championship.

Sacramento exits after a remarkable journey from **4–6** to **7–6** and the playoffs. The Gold Rush won three straight to qualify, including a decisive regular-season finale against Milwaukee. Their late surge was real; so was San Antonio''s ability to exploit their weaknesses when it mattered.

## Defining Play

**Bobo''s 14-yard run on third-and-2 late in the fourth quarter.** Sacramento had cut the lead to three and needed the ball back. Bobo''s conversion allowed San Antonio to kneel out the clock and ended the possibility of a fourth-quarter comeback.

## Offensive Player of the Game

**Nathan, San Antonio Outlaws.** Seven receptions, **103 yards and two touchdowns**. His 27-yard score tied the game in the third; his 8-yard score gave the Outlaws the decisive nine-point cushion in the fourth.

## Defensive Player of the Game

**Fuzz, San Antonio Outlaws.** With **seven tackles for loss and a sack** credited in the game history, Fuzz made Sacramento''s offense work for nearly every crucial yard. His impact was a major reason Kiwi never established the kind of rushing rhythm that powered the Gold Rush into the postseason.

## Summary

San Antonio eliminated Sacramento **21–18** after overcoming a **12–6 halftime deficit**. Two touchdown catches by Nathan and a late Bobo first-down run secured the win. The Outlaws advance to meet Portland; Sacramento''s three-game winning streak and playoff run end.', '2026-11-24T21:14:54.304Z', 1, NULL),
('2026-playoffs-g67-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', 'd20d1b4f-33cd-58e4-bb93-068986ed57a6', 'Divisionals', NULL, 'game_recap', 'published', 'Baby''s Fourth-Quarter Takeover Stuns Charlotte as Richmond Advances, 21–18', 'Down 12–3 after three quarters, Richmond rallies behind Baby''s 186 yards from scrimmage and two rushing scores, including the winner with 1:58 left. The Rebellion upset Charlotte 21–18 and advance to Nashville.', 'For three quarters, Charlotte appeared to have survived the most dangerous part of its playoff opener. The Kingsmen led **12–3**, Richmond''s offense was sputtering, and the home crowd could see a trip to the East Division Championship coming into focus.

Then **Baby** took over.

Richmond''s two-way star rushed for **120 yards and two touchdowns**, added **66 receiving yards**, and helped drive a fourth-quarter comeback that produced an improbable **21–18 victory** over Charlotte. The Rebellion, the East''s lower-seeded survivor with a **6–7 regular-season record**, advance to face top-seeded Nashville. Charlotte, which finished **8–5**, is eliminated after surrendering 18 points in the final quarter.

This was the teams'' third meeting. Charlotte won **24–21 in Week 3**, but Richmond answered **30–18 in Week 12**. The rubber match carried the highest stakes of all.

## Charlotte Controls the Early Game

Charlotte struck first after its opening possessions established favorable field position. The Kingsmen settled for a **field goal with 10:08 left in the first quarter**, taking a **3–0** lead.

Richmond struggled to sustain drives, with Charlotte forcing a series of punts and keeping John from finding rhythm. Early in the second quarter, the home team expanded its advantage when **Rat scored from 1 yard out with 12:20 remaining**.

**Charlotte 9, Richmond 0.**

The Kingsmen were controlling both field position and the scoreboard. Their defense was making the Rebellion earn every first down, and Richmond''s normally productive offense had little room to operate.

Richmond finally got on the board with a **field goal at 2:16 before halftime**, cutting the margin to **9–3**. It wasn''t the touchdown the visitors needed, but it prevented the half from ending in a shutout.

The third quarter brought another long stretch of resistance. Charlotte added a **field goal with 3:54 remaining**, stretching the lead to **12–3**.

After 45 minutes, Richmond had produced only three points. The Rebellion needed something far more dramatic than an ordinary comeback.

## A Fourth Quarter That Changed Everything

The first snap of the fourth quarter finally brought an offensive breakthrough. **John connected with Brownie for a 17-yard touchdown**, cutting the deficit to **12–9**.

The score changed the atmosphere. Richmond had gone from needing two possessions just to take the lead to trailing by one field goal. Charlotte''s previously comfortable advantage suddenly looked fragile.

Baby then delivered the play that turned momentum completely. With **8:11 remaining**, he broke free for a **24-yard rushing touchdown** and gave Richmond its first lead of the game, **15–12**.

For the Kingsmen, the challenge was now psychological as much as tactical. They had controlled nearly the entire game but found themselves trailing with the season on the line.

Tweety responded like the quarterback who had powered Charlotte''s 8–5 regular season.

He completed a 10-yard pass to Rat, recovered from a sack, converted third downs with Jimbo and Rat, and eventually connected on consecutive throws of **13 and 14 yards to Babe TreeClimbers**. Deep in Richmond territory, he found Babe TreeClimbers again for a **4-yard touchdown with 4:15 remaining**.

Charlotte retook the lead **18–15**.

The Kingsmen had answered Richmond''s surge. All they needed was one defensive stand.

They didn''t get it.

## Baby Delivers the Final Answer

Richmond began its final scoring drive with **4:10 left**. John found Baby for **8 yards** on second down, putting the visitors in manageable territory.

Then Baby began breaking the game open on the ground.

He gained **24 yards on third-and-2**, moving Richmond across midfield. On the next play, he ran for **18 more**, another first down. John then hit Brownie for **19 yards**, carrying the ball to the Charlotte 6.

With **1:58 remaining**, Baby took the handoff and scored from **6 yards out**.

**Richmond 21, Charlotte 18.**

That drive captured the dual nature of Baby''s value: he could catch when defenses expected a run, break runs when a conversion was essential, and finish a possession in the end zone.

Charlotte still had a chance. Tweety moved the Kingsmen into Richmond territory, finding Rat for 14 yards and Jimbo for eight. Rat converted a third-and-2 run for a first down. But the offense stalled just past midfield.

After an incomplete throw, a 6-yard completion and another incompletion, Charlotte faced **fourth-and-4 with 53 seconds remaining**. Tweety targeted Babe TreeClimbers. The pass failed, and the possession ended on downs.

Richmond kneeled out the remaining time.

**Final: Richmond 21, Charlotte 18.**

## Baby''s Complete Performance

Baby''s final offensive line was **19 carries for 120 yards and two touchdowns**, plus **six receptions for 66 yards**. That''s **186 yards from scrimmage** against one of the East''s top teams.

But his work did not stop there. The game history also credits him with **13 tackles, five tackles for loss and four sacks**. It was a remarkably complete postseason performance: Richmond''s leading runner, one of its key receiving options, its late-game scorer and its most disruptive defender.

John completed **18 of 31 passes for 208 yards and a touchdown**. Brownie finished with **five receptions for 62 yards and the touchdown that opened the fourth-quarter comeback**.

Charlotte''s Tweety threw for **263 yards on 31-of-53 passing** and a touchdown. Jimbo produced **11 catches for 81 yards**, while Rat contributed **29 rushing yards and a touchdown**, plus **nine catches for 66 yards**.

Charlotte accumulated enough offense to threaten a win, but Richmond scored touchdowns while the Kingsmen had twice settled for field goals. In the end, that distinction mattered as much as the late heroics.

## The Road Ahead

Richmond now travels to Nashville, where the Shock await after finishing the regular season **9–1–3**. Nashville beat the Rebellion **24–9 in Week 2** and **27–18 in Week 11**, meaning the East Division Championship will be their third meeting.

Charlotte''s defeat ends the Kingsmen''s season despite an **8–5** record and a strong statistical year from Tweety. Leading 12–3 through three quarters was not enough against a player capable of turning one period into a defining performance.

## Defining Play

**Baby''s 24-yard third-down run with 3:28 left in the fourth quarter.** Richmond trailed **18–15**, faced third-and-2, and needed to keep the ball. Baby broke free for 24 yards, followed with an 18-yard run, and set the table for his winning six-yard touchdown.

## Offensive Player of the Game

**Baby, Richmond Rebellion.** **120 rushing yards, 66 receiving yards and two touchdowns**, including the go-ahead score at 8:11 and the winner at 1:58. Richmond''s entire comeback flowed through him.

## Defensive Player of the Game

**Baby, Richmond Rebellion.** The play history credits him with **13 tackles, five tackles for loss and four sacks**. He was as influential disrupting Charlotte''s possessions as he was finishing Richmond''s own drives.

## Summary

Richmond rallied from a **12–3 deficit after three quarters** to eliminate Charlotte **21–18**. Baby delivered **186 yards from scrimmage, two rushing touchdowns and major defensive production**. The Rebellion advance to the East Division Championship at Nashville, while the Kingsmen''s season ends in heartbreak.', '2026-11-24T21:14:54.304Z', 1, NULL),
('2026-playoffs-championship-preview', '97808f43-a0d5-5251-bf8d-fae1643c8258', NULL, 'Divisional Championships', NULL, 'playoff_preview', 'published', 'Four Teams, One Crown: Predicting the Division Championships and AFL National Championship', 'A full playoff forecast: Portland–San Antonio and Nashville–Richmond, the paths to victory for all four teams, x-factors and predicted scores, followed by a projected national title matchup and champion.', '# Four Teams, One Crown: Predicting the Division Championships and AFL National Championship

The AFL postseason has already delivered a reminder that the regular-season standings are only the beginning of the argument. San Antonio needed a fourth-quarter stand to survive Sacramento **21–18**, while Richmond overturned a nine-point deficit entering the fourth against Charlotte and won **21–18** behind an extraordinary two-way performance from Baby. Those victories send the Outlaws and Rebellion into championship-week matchups with the two highest-ranked teams from the regular season.

Now the stakes rise. Portland (**8–3–2**) hosts San Antonio (**7–6**) in the West Division Championship, and Nashville (**9–1–3**) hosts Richmond (**6–7**) in the East. The Wildfire and Shock earned their places with consistency across thirteen weeks; their challengers arrive hardened by elimination games. Both division championships are rematches of familiar opponents, and the projected national championship carries an especially intriguing possibility: a second meeting between the league''s two most dominant running backs.

## West Division Championship: San Antonio Outlaws at Portland Wildfire

**Regular-season series: tied 1–1. Portland won 41–24 in Week 3; San Antonio won 24–15 in Week 11.**

The West title game could hardly be framed more neatly. Portland has the league''s most explosive rushing attack, headlined by Ezekiel''s **2,412 regular-season rushing yards**, while San Antonio has one of the AFL''s most accomplished all-purpose backs in Luke, supported by the relentless two-way trench play of Fuzz. They have beaten one another by nine points or more, so neither needs to invent a blueprint for victory. The question is which version of these teams appears when everything is at stake.

Portland''s early-season 41–24 victory suggested the Wildfire could simply overwhelm the Outlaws. San Antonio''s 24–15 revenge win in Week 11 told a different story: contain the ground game, force Portland into a more predictable passing script, and make the Wildfire play from behind. The Outlaws enter having just held Sacramento''s Kiwi to **35 rushing yards on 14 carries**, an encouraging sign before confronting an even more imposing runner.

### How Portland Can Win

**Make Ezekiel the center of the game without making him the only answer.** Portland is at its most dangerous when Ezekiel gets consistent early-down opportunities and Big Boy provides a second physical rushing threat. The Wildfire rushed for nearly 300 yards from that pair alone against Albuquerque in the regular-season finale. Forcing San Antonio''s front to defend both backs would create manageable third downs and give C Monster occasional chances to hit passes against defenses crowding the line.

The Wildfire also need to win field position through disruption. Frog recorded **32 regular-season tackles for loss and seven sacks**, while C Monster supplied significant defensive production alongside his quarterback duties. If that group can force Olaf and the Outlaws into third-and-long, Portland can prevent Luke''s ball-control running from setting the game''s tempo. The Wildfire must avoid the extended scoring drought that made their Week 11 loss to San Antonio possible.

### How San Antonio Can Win

**Repeat the defensive formula from Week 11 and finish with the ball in Luke''s hands.** Fuzz is the centerpiece of that plan. The Outlaws'' star lineman disrupted Sacramento throughout the first-round matchup, with seven tackles for loss credited in the play history. Against Portland, his assignments will be more demanding: the goal isn''t necessarily to shut Ezekiel down entirely, but to make enough negative plays to keep the Wildfire from running the same offense all afternoon.

Offensively, San Antonio cannot depend on Luke alone. Nathan''s **two touchdown catches against Sacramento** changed that playoff game, and Olaf''s willingness to attack the intermediate field gave the Outlaws a way out of difficult situations. Luke can control the clock, but Nathan and the passing attack must convert those possessions into six-point drives rather than settle for field goals.

### X-Factor: Ezekiel vs. Fuzz

This is the matchup that could decide the West. Ezekiel represents the league''s best combination of rushing volume and explosive-play efficiency. Fuzz represents one of its greatest sources of defensive penetration. If Ezekiel consistently reaches the second level, Portland can build the kind of advantage it did in Week 3. If Fuzz forces repeated losses and short gains, San Antonio can reproduce the conditions of its Week 11 victory.

There is also an underlying danger for Portland: the Outlaws have just proven they can keep a dangerous opponent under control in a close playoff game. The Wildfire have the higher ceiling, but San Antonio may be more comfortable in a one-possession finish.

### Prediction: Portland 27, San Antonio 21

The pick is **Portland**, narrowly. Ezekiel and Big Boy should find enough rushing production at home to prevent San Antonio from completely dictating the pace, while Frog and Portland''s defense create one or two vital negative plays against Luke. Expect Fuzz to keep the Outlaws within striking distance, and expect Nathan to be heavily involved, but Portland''s ground attack ultimately produces one more touchdown than San Antonio can match.

**Projected West champion: Portland Wildfire.**

## East Division Championship: Richmond Rebellion at Nashville Shock

**Regular-season series: Nashville leads 2–0. The Shock won 24–9 in Week 2 and 27–18 in Week 11.**

Nashville has been the standard of the East all season. Its **9–1–3 record** includes just one loss, and Koala has powered the offense with **2,093 regular-season rushing yards and 23 total touchdowns**. The Shock beat Richmond twice by a combined **24 points**, with their ability to control possessions proving too much for the Rebellion.

But the Richmond arriving in Nashville is not quite the same team those results describe. The Rebellion closed the regular season **6–7** and entered the playoffs as a lower seed, then stunned Charlotte with 18 fourth-quarter points. Baby accounted for **186 yards from scrimmage and two rushing touchdowns** in that victory, while also delivering a tremendous defensive performance. Richmond may be the less consistent team, but it is dangerous precisely because its star can change the game in several ways at once.

### How Nashville Can Win

**Control early downs, protect the football and make Richmond defend Koala for four quarters.** Nashville''s best offense doesn''t need a collection of long touchdowns. It needs Koala moving the chains, keeping the defense fresh and setting up scoring opportunities for Leon Gory and receivers such as Barnsworth. Koala recorded **134 rushing first downs** during the regular season, a measure of just how well the Shock can sustain possession.

The defense must also avoid giving Baby a clean path to the second level. Sloth and Ernie have been particularly disruptive near the line of scrimmage, and Nashville will need both to win their matchups. If Baby is met in the backfield often enough, Richmond will be forced to ask John to sustain long passing drives against a defense that has repeatedly protected narrow leads.

### How Richmond Can Win

**Turn this into an unpredictable, physical game rather than a Koala possession contest.** Richmond''s best chance is to alternate Baby''s rushing opportunities with John''s passing game, especially throws to Brownie and Ralph when Nashville crowds the line. Baby cannot be the entire offense; Charlotte saw what happened when Richmond finally found complementary passing answers, and the 17-yard John-to-Brownie touchdown at the opening of the fourth quarter was the spark that made the comeback possible.

Defensively, the Rebellion need Baby''s versatility again, but cannot count on another superhuman performance as the entire strategy. The goal should be to force Nashville into field goals, create one extra possession, and keep the game close enough for Baby to decide in the final minutes. Richmond cannot afford to trail by multiple possessions with the clock running down against a Shock team built to consume it.

### X-Factor: Baby vs. Nashville''s Interior Front

Baby is both Richmond''s most important offensive option and one of its most disruptive defenders. He faces a difficult assignment against a Nashville offensive line that helps create Koala''s consistent rushing production, while Sloth, Ernie and the Shock front must also account for him when Richmond possesses the ball.

If Baby can win enough collisions on both sides, Richmond has a genuine upset path. If Nashville''s line absorbs his impact and Koala continues moving the chains, the Shock will make this feel like the regular-season meetings all over again.

### Prediction: Nashville 24, Richmond 18

Richmond has earned respect, and Baby is capable of keeping the game competitive into the fourth. Nevertheless, **Nashville''s balance and consistency** make it the pick. Koala should control enough early downs to keep John and Baby from receiving the possessions they need, while Barnsworth offers an answer when Richmond sells out against the run. The Rebellion will find the end zone, but the Shock''s superior ability to sustain drives should carry them through.

**Projected East champion: Nashville Shock.**

## Projected AFL National Championship: Nashville Shock vs. Portland Wildfire

If these predictions hold, the AFL''s championship game becomes the matchup the regular season has been building toward: **No. 1 Nashville against No. 2 Portland; Koala against Ezekiel**. The clubs met once in Week 8, when Portland handed Nashville its only regular-season defeat, **21–15**. Ezekiel rushed for **119 yards and two touchdowns**, while C Monster threw for **216 yards and a score**. Koala was held to **82 rushing yards and a touchdown**. Portland therefore owns the most valuable evidence in the matchup: it has already proven it can beat the Shock.

Yet this is not merely a rerun of Week 8. Nashville''s reliability over the full season is unmatched, and Koala''s ability to turn dozens of carries into an advantage remains the best foundation for a title run. Portland has the more explosive rushing threat and an aggressive defensive front. A national championship between them would be a referendum on two different forms of control: the ability to break a game open versus the ability to keep it exactly where you want it.

### How Nashville Can Win

**Win the possession battle and force Ezekiel to watch from the sideline.** Koala''s volume and first-down production can shorten the game, but Nashville will also need Leon Gory to make timely throws when Portland crowds the box. Barnsworth''s route-running and late-game scoring ability become essential if the Shock find themselves facing third downs near the red zone. Nashville should avoid gambling on a high-scoring track meet. Its best path is to make Portland earn every possession, then punish mistakes.

Defensively, the Shock must prevent the 20-, 30- and 50-yard bursts that turn Ezekiel''s good games into historic ones. There may be no way to eliminate his production entirely; winning could require holding him to steady gains instead of game-breaking touchdowns.

### How Portland Can Win

**Attack before Nashville settles into its preferred pace.** Ezekiel needs to force the Shock to adjust early, while Big Boy gives Portland a second runner who can wear down the interior defense. C Monster must also keep the passing game credible; Nashville will have seen how heavily Portland depends on its ground attack and will likely commit extra defenders to stopping it.

On defense, Frog and C Monster need to create negative plays against Koala. The difference between second-and-5 and second-and-12 could determine whether Nashville sustains a possession or has to punt. Portland''s prior victory showed that it can withstand the Shock''s offense and still generate enough scoring chances to win.

### X-Factor: Koala''s Consistency vs. Ezekiel''s Explosiveness

Both backs have been dominant, but in different ways. Koala finished the regular season with **2,093 rushing yards, 23 total touchdowns and 134 rushing first downs**. Ezekiel finished with **2,412 rushing yards, 19 total touchdowns and a league-leading 29 runs of 20 or more yards**.

Koala can create six or seven successful plays in a row. Ezekiel can erase six or seven plays with one burst. The championship could come down to which skill proves more valuable with the game balanced in the fourth quarter.

### National Championship Prediction: Nashville 24, Portland 21

The choice is **Nashville**, by a field goal. Portland has the blueprint to beat the Shock, and Ezekiel will almost certainly deliver at least one explosive moment. But a rematch gives Nashville a chance to tighten its defensive approach, while Koala''s ability to keep the offense on schedule should give the Shock an edge in a close finish. Expect Portland to remain dangerous until the final possession; expect Nashville to make just enough timely stops and conversions to claim the crown.

**Projected AFL national champion: Nashville Shock.**

## The Final Word

There is no safe route to an AFL title this year. San Antonio has already beaten Portland, Richmond has shown it can topple a favored opponent in the fourth quarter, and both top seeds have vulnerabilities that the challengers understand. That is what makes these division championships compelling: none of the four remaining teams needs to imagine how to win a big game. Each has done it.

Still, over a season defined by Koala''s relentless production and Nashville''s refusal to lose, the Shock have built the strongest case to finish on top. The prediction is a Nashville–Portland championship decided in the closing minutes, with **Nashville lifting the trophy after a 24–21 victory**.', '2026-11-24T21:14:54.304Z', 1, NULL),
('2026-playoffs-g69-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '26abcbcd-7506-5ad3-8857-37ad89825ebe', 'Divisional Championships', NULL, 'game_recap', 'published', 'From 15 Down to the Title Game: Nashville Rallies Past Richmond 24–18 for East Crown', 'Baby''s 62-yard touchdown helps Richmond surge ahead 15–0, but Leon Gory throws three touchdown passes and Koala rushes for 208 yards with the winner as Nashville survives 24–18 to reach the national championship.', 'Richmond had already shocked one favorite. For a quarter and a half in Nashville, the Rebellion looked ready to do it again.

Baby tore through the Shock for a **62-yard touchdown** on Richmond''s opening drive, and by the opening minutes of the second quarter the visitors held a startling **15–0 lead**. Nashville''s season—the best regular-season campaign in the AFL at **9–1–3**—was in danger of ending without a trip to the championship game.

Instead, the Shock staged the comeback that might define their year. Leon Gory threw **three unanswered touchdown passes**, Koala rushed for **208 yards** and the go-ahead score, and Nashville survived a desperate Richmond possession in the closing seconds to win **24–18** in the **East Division Championship**. The Shock advance to the AFL National Championship, where they will face the winner of Portland–San Antonio.

It was Nashville''s third victory over Richmond this season. The Shock won **24–9 in Week 2** and **27–18 in Week 11**, but neither game required anything approaching this kind of recovery. Richmond had entered the playoffs **6–7** and then stunned Charlotte 21–18. It nearly turned that breakthrough into a second consecutive upset before Nashville''s passing game, running attack and defense finally asserted themselves.

## Baby Lands the First Punch

Richmond opened the game at its own 25 and immediately demonstrated that its offense could move against Nashville. John found Junior for **12 yards on third-and-9**, converting a potentially drive-ending situation. On the next snap, Baby hit a crease and exploded for a **62-yard touchdown with 13:43 remaining in the first quarter**.

**Richmond 6, Nashville 0.**

The message was unmistakable: the Rebellion weren''t coming to Nashville merely to survive. Baby had already supplied the explosive play that their upset bid needed.

Nashville began responding with Koala and a completion to Mini, but its opening attempts to establish rhythm failed to produce points. Richmond stayed aggressive, with Baby adding a **21-yard run** later in the first quarter to move the ball again.

The Rebellion extended their lead on a **field goal with 4:32 remaining**, making it **9–0**. As the quarter ended, Richmond was not only ahead; it was controlling field position and forcing the league''s top seed into the unfamiliar position of chasing the game.

Early in the second, Richmond moved inside the Nashville 10. Baby converted **third-and-2 with a 3-yard run**, then gained another three yards before plunging into the end zone from **3 yards out at 13:46**.

**Richmond 15, Nashville 0.**

Two touchdowns from Baby. A fifteen-point advantage. The lower seed had exactly the start it needed.

## Leon Gory Ignites the Comeback

The Shock finally responded with urgency.

On their next possession, Koala ripped off runs of **26 and 13 yards**, rapidly shifting the field. Nashville still faced a difficult **third-and-11**, but Leon Gory found Mini for **12 yards** to extend the drive. A few snaps later, he connected with **Barnsworth for a 10-yard touchdown with 10:08 remaining in the second quarter**.

The deficit was cut to **15–6**.

The significance was bigger than a single score. Richmond had bottled up the Shock on the scoreboard through the early stretch, but Nashville was finally combining Koala''s rushing with timely throws to stay ahead of the chains.

The Shock returned to the air late in the half. With **54 seconds remaining**, Leon Gory found **Mini on a 14-yard touchdown pass**, bringing Nashville within **15–12**.

A game that looked dangerously close to getting away from the top seed was now a three-point contest at halftime.

Richmond had controlled the opening stretch. Nashville had scored twice when it most needed to.

## Three Touchdown Passes Turn the Game

Nashville received the second-half possession and refused to slow down.

Koala gained eight yards on the opening play, then broke loose for **29 yards on third-and-2**. Leon Gory hit Mini for another first down, and Koala added runs of seven and nine yards to carry the Shock into scoring position.

With **13:21 left in the third quarter**, Leon Gory found **Oliver for a 12-yard touchdown**.

For the first time all game, Nashville led: **18–15**.

The sequence was a complete reversal of the first quarter. Nashville had scored **18 consecutive points**, with Leon Gory responsible for all three touchdowns through the air. The Shock had found an answer to Richmond''s willingness to crowd the ground game, while Koala''s runs continued forcing the defense to respect the line of scrimmage.

Richmond was hardly finished, though. Baby remained dangerous—he would add a **20-yard gain** later in the quarter—and John connected with Brownie for **24 yards** as the Rebellion worked back into scoring position.

That drive eventually delivered a **field goal at 13:36 of the fourth**, bringing the game level at **18–18**.

After surrendering eighteen unanswered points, Richmond had found a way to reset the contest. Fifteen minutes remained to determine the East''s representative in the championship game.

## Koala Delivers the Winning Touchdown

A tied game offered Nashville the simplest possible proposition: give the ball to its MVP-caliber running back and let him help create the winning possession.

The Shock moved into Richmond territory and faced **third-and-6** in the fourth quarter. Leon Gory found **Oliver for 15 yards**, keeping the drive alive. Koala added a five-yard run, and another completion to Oliver gained five more for a first down near the goal line.

With **6:09 remaining**, Koala took the handoff from the Richmond 2 and scored.

**Nashville 24, Richmond 18.**

Koala finished with **208 rushing yards on 33 carries**, plus **one reception for 11 yards**, totaling **219 yards from scrimmage**. His 2-yard touchdown was his only score of the evening, but it was the most important one. After Leon Gory''s passing game erased the early deficit, Koala supplied the final lead.

Leon Gory finished **17-of-29 passing for 178 yards and three touchdowns**, with scores to Barnsworth, Mini and Oliver. Mini caught **seven passes for 77 yards**, Oliver added **six for 59**, and Barnsworth contributed **three catches for 31 yards**, including his touchdown.

Nashville had needed different players to answer different moments. Its quarterback rescued the game; its leading runner put it away.

Or so it seemed.

## Richmond''s Last Chance Reaches the Red Zone

Richmond took over trailing by six with just over six minutes remaining. The Rebellion didn''t panic. Baby gained a fourth-and-1 conversion, John kept finding Brownie, and a steady series of modest advances carried the visitors across midfield.

The drive had the makings of another upset. With **2:22 remaining**, John found Brownie for **11 yards and a first down**, moving Richmond closer to a potential game-winning touchdown.

Then Nashville''s defense began turning the situation against the Rebellion.

Jelly sacked John for a **4-yard loss with 1:49 remaining**. A short completion to Ralph moved the ball forward, but the clock continued to drain. Richmond converted another **fourth-and-2** when Baby gained three yards with 53 seconds left.

The Shock still couldn''t close the door completely. But Barnsworth delivered a devastating **9-yard sack with 41 seconds remaining**, forcing Richmond into second-and-19. John answered with an **18-yard completion to Brownie**, then found Baby for **11 more yards on third-and-1**.

Suddenly, the Rebellion had reached the **Nashville 12** with ten seconds left.

They had two opportunities to steal the game.

John''s first pass fell incomplete. His next throw, intended for Brownie with **five seconds remaining**, was also incomplete.

The comeback attempt ended there.

**Final: Nashville Shock 24, Richmond Rebellion 18.**

It was a finish worthy of the stakes: Richmond began by stunning Nashville, Nashville counterpunched with three straight touchdown passes, and the outcome remained unresolved until the final snap.

## Baby''s Heroics Fall Short

Richmond''s season ends with an extraordinary performance from the player who had kept its postseason hopes alive the week before.

Baby carried **25 times for 169 rushing yards and two touchdowns**, adding **five receptions for 43 yards**. His **212 yards from scrimmage** included the 62-yard touchdown that silenced Nashville early and the 3-yard score that pushed the Rebellion ahead 15–0. He also contributed defensively, registering seven tackles and a sack in the game history.

John completed **24 of 46 passes for 234 yards**. Brownie was his most effective target, finishing with **12 receptions for 139 yards**, including key late catches that nearly carried Richmond to the end zone.

The Rebellion had enough production to win. What they couldn''t afford was the long stretch between their second touchdown and the fourth-quarter field goal. Nashville scored 18 unanswered points during that period, turning an apparently commanding Richmond lead into a deficit.

The loss should not erase Richmond''s improbable playoff run. After finishing **6–7**, the Rebellion eliminated an **8–5 Charlotte team** and pushed the league''s top seed to the final seconds on the road. Baby was the catalyst in both games, but the margins finally ran against them.

## What It Means for Nashville

Nashville advances to the **AFL National Championship** and remains the team to beat. The Shock''s record and season-long consistency established them as favorites; this comeback demonstrated another quality that matters just as much in January-style football: the ability to survive when the preferred game plan collapses.

A 15-point deficit against an energized underdog could have ended the season. Instead, Leon Gory adjusted through the air, Koala continued producing first downs, and Nashville''s front supplied enough pressure late to keep Richmond out of the end zone.

Their championship opponent will be the winner of the **West Division Championship between Portland and San Antonio**, which remains unplayed in the workbook at publication time. A Portland victory would set up a rematch of Nashville''s only regular-season loss, a **21–15 defeat in Week 8**. A San Antonio win would create a rematch of Nashville''s **12–6 victory in Week 7**.

Either way, Nashville will arrive having already survived its most frightening deficit of the season.

## Defining Play

**Leon Gory''s 12-yard touchdown pass to Oliver with 13:21 left in the third quarter.** Nashville had trailed **15–0** early in the second, and this throw completed an **18-point unanswered comeback**. It was the moment the Shock transformed the game from an exercise in damage control into a championship-level response.

Koala''s 2-yard touchdown later won it, but Gory''s third scoring strike was the play that fully reversed the contest.

## Offensive Player of the Game

**Leon Gory, Nashville Shock.**

**17-of-29 passing, 178 yards, three touchdowns.**

Koala''s **208 rushing yards** merit serious consideration, and his go-ahead touchdown ultimately decided the score. But with Nashville trailing **15–0**, it was Gory''s ability to find three different touchdown receivers—Barnsworth, Mini and Oliver—that rescued the offense. The Shock needed their quarterback to change the shape of the game, and he delivered.

## Defensive Player of the Game

**Barnsworth, Nashville Shock.**

**Seven tackles, four tackles for loss and one sack**, according to the game history.

Barnsworth contributed on offense, but his most valuable defensive moment came with **41 seconds remaining**, when he sacked John for a **9-yard loss**. Richmond kept fighting and reached the Nashville 12, yet the sack forced it to burn precious time and play through a far less forgiving down-and-distance situation.

Sloth also recorded **four tackles for loss and a sack**, while Jelly finished with **14 tackles and two sacks** in Nashville''s defensive effort.

## Summary

The Nashville Shock are headed to the AFL National Championship after erasing a **15–0 deficit** and defeating Richmond **24–18**. Leon Gory threw three consecutive touchdown passes, Koala ran for **208 yards and the game-winning score**, and Nashville held firm after Richmond reached its 12-yard line in the final seconds. Baby''s **212 scrimmage yards and two touchdowns** nearly carried the Rebellion to another upset, but the Shock advance to face Portland or San Antonio for the league title.', '2026-11-25T05:59:40.403Z', 1, NULL),
('2026-playoffs-g68-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '7532f147-44e3-57c8-91ff-8a498dc6fa2c', 'Divisional Championships', NULL, 'game_recap', 'published', 'Outlaws Shock Portland in Overtime, 12–9, to Reach AFL National Championship', 'San Antonio edges Portland 12–9 in overtime after a pivotal Ezekiel fumble, a goal-line fourth-down stand and Olaf''s 19-yard third-and-17 completion to Nathan setting up the winning kick. The Outlaws advance to face Nashville for the title.', '<div style="background:#101a2d;color:#fff;border-radius:14px;padding:22px 18px;margin:0 0 24px;text-align:center;">
  <div style="font-size:12px;letter-spacing:2px;font-weight:700;opacity:.8;margin-bottom:16px;">AFL · WEST DIVISION CHAMPIONSHIP · FINAL / OT</div>
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;">
    <div style="flex:1;min-width:0;">
      <img src="https://andrew-jacobson06.github.io/public-audio/wildfire.png" alt="Portland Wildfire logo" width="72" height="72" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 8px;" />
      <div style="font-size:14px;font-weight:700;">PORTLAND WILDFIRE</div>
      <div style="font-size:38px;font-weight:800;line-height:1.2;">9</div>
    </div>
    <div style="font-size:13px;font-weight:800;opacity:.7;">FINAL<br/>OT</div>
    <div style="flex:1;min-width:0;">
      <img src="https://andrew-jacobson06.github.io/public-audio/outlaw.png" alt="San Antonio Outlaws logo" width="72" height="72" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 8px;" />
      <div style="font-size:14px;font-weight:700;">SAN ANTONIO OUTLAWS</div>
      <div style="font-size:38px;font-weight:800;line-height:1.2;">12</div>
    </div>
  </div>
  <div style="font-size:13px;font-weight:600;margin-top:14px;">SAN ANTONIO ADVANCES TO THE AFL NATIONAL CHAMPIONSHIP</div>
</div>

# Outlaws Shock Portland in Overtime, 12–9, to Reach AFL National Championship

**PORTLAND —** For much of the season, the Portland Wildfire could count on Ezekiel to turn a stubborn defense into a highlight reel. In the West Division Championship, the San Antonio Outlaws turned that advantage upside down. They held the league''s leading rusher under 100 yards, capitalized on Portland''s mistakes, and found the field goal that mattered most in overtime.

San Antonio defeated Portland **12–9 in overtime**, claiming the West championship and earning a trip to the AFL National Championship against Nashville. It was the Outlaws'' second consecutive playoff victory by a single possession, following a 21–18 win over Sacramento, and their second victory over Portland in the last two meetings. Portland, the **8–3–2** regular-season runner-up, exits despite earning the West''s top playoff position. San Antonio, which finished **7–6**, is one win away from a league title.

The teams had split their regular-season meetings: Portland won **41–24 in Week 3**, but San Antonio answered with a **24–15 victory in Week 11**. The championship rubber match looked nothing like the first encounter. Instead of a shootout between two talented backfields, it became a tense battle over field position, ball security and one extra yard.

## A Fumble Opens the Door for Portland

San Antonio''s opening possessions showed that the Outlaws weren''t going to retreat from Portland''s defense. Olaf hit Luke for **18 yards** early, and later connected with him for **20 more** before Luke added a **19-yard rush**. The visitors were marching toward the Portland end of the field with the game still scoreless.

Then the first major mistake arrived. Olaf completed a **13-yard pass to Bobo**, but Bobo lost the football. **Ezekiel recovered for Portland**, ending a promising San Antonio possession with **6:16 remaining in the first quarter**.

Portland''s offense made that turnover hurt. C Monster connected with Wasabi and Hippo as the Wildfire moved downfield. Facing third-and-9 late in the quarter, C Monster found Hippo for **13 yards** to extend the drive. Then, with **41 seconds remaining**, he hit Hippo again, this time for a **14-yard touchdown**.

**Portland 6, San Antonio 0.**

The Wildfire had taken the lead through the air rather than on one of Ezekiel''s trademark long runs. The score came directly after San Antonio surrendered possession, the kind of sequence that can decide a championship game when points are scarce.

## Portland''s Own Turnover Changes the First Half

Ezekiel started the second quarter working to establish his usual rhythm, and the Wildfire kept one drive alive when Big Boy converted **fourth-and-1 with a 2-yard run**. Portland appeared to be building the kind of deliberate possession that had made it so dangerous all year.

But ball security, which had been a strength of Ezekiel''s regular season, suddenly became a problem.

On a first-down carry with **9:32 left in the second quarter**, Ezekiel put the ball on the ground. He recovered his own fumble, allowing Portland to continue. It was a warning, not yet a turnover.

Less than three minutes later, the warning became costly. On **third-and-11 with 7:20 remaining**, Ezekiel gained four yards but **fumbled again**, and **Bobo recovered for San Antonio**. The Outlaws took possession, denying Portland the chance to extend its six-point lead.

That takeaway became the foundation of San Antonio''s first scoring drive. The Outlaws moved into field-goal range behind the short passing game and a patient rushing attack, and kicked a **field goal with 20 seconds remaining before halftime**.

**Halftime: Portland 6, San Antonio 3.**

Both offenses had missed opportunities, and both had surrendered the football once. Portland''s defense had held up, but the offense had failed to create any separation. The game was exactly where San Antonio wanted it: close, physical and vulnerable to a single swing.

## The Four Yards Portland Couldn''t Find

The third quarter provided the game''s defining test of Portland''s offensive identity.

The Wildfire opened the half with the ball and put together a lengthy drive, relying heavily on Ezekiel to move downfield. The possession reached the San Antonio 6-yard line, but the defense held a first attempt to a one-yard gain, then stopped Ezekiel for two more on third down.

Facing **fourth-and-3 at the Outlaws'' 3 with 6:29 remaining**, Portland stayed with Ezekiel rather than taking a field goal. He gained **two yards**.

The Outlaws took over on downs at their own 1.

It was a devastating missed opportunity in a game where touchdowns were rare. Portland had crossed nearly the entire field but came away empty. San Antonio had avoided surrendering points while preserving the possibility of taking the lead with one touchdown of its own.

The teams remained locked at **6–3** through the end of the third quarter. Portland''s rushing success had been reduced to grinding gains, not explosive scores, and the Outlaws'' interior defense was winning the moments that mattered.

## Bobo Breaks Through in the Fourth

San Antonio continued to lean into the defensive struggle, asking Olaf to make manageable throws while Luke and Bobo fought for yards. The Outlaws advanced deep into Portland territory and reached the 3-yard line early in the fourth quarter.

Three straight Bobo runs finished the job. He gained one yard on first down, another on second, then powered into the end zone from **one yard out with 7:26 remaining**.

For the first time all game, San Antonio led.

**Outlaws 9, Wildfire 6.**

The score was almost the opposite of what many expected when Portland entered as the West''s top seed. The Wildfire were chasing points against a defense that had contained their biggest weapon, and San Antonio was playing with the composure of a team that had already survived one playoff thriller.

Portland still had time for one answer. C Monster repeatedly looked to Hippo, who became the Wildfire''s most productive receiver. The drive eventually reached the San Antonio 20, but the passing game stalled with consecutive incompletions on second and third down.

With **50 seconds remaining**, Portland kicked a field goal to tie it **9–9**.

Neither team found a winner in the closing seconds of regulation. The West championship was going to overtime.

## Overtime Belongs to the Outlaws

San Antonio took the first possession in the extra period and immediately found itself needing to convert. Luke managed just three yards on his first two carries, leaving **third-and-7**. Olaf found **Nathan for seven yards**, keeping the drive alive.

Luke followed with an **11-yard run** and then four more, but a two-yard loss and an incomplete pass forced the Outlaws to punt.

Portland had its opportunity to win. The Wildfire took over deep in their own territory and got a **13-yard completion from C Monster to Hippo** for a first down. But Ezekiel was stopped for a two-yard loss, then held to consecutive runs of no gain. On third-and-10, C Monster''s pass intended for Hippo fell incomplete.

The Wildfire punted.

San Antonio took possession and started building one last drive. Bobo converted **third-and-2 with a 10-yard run**, giving the Outlaws a first down and preserving their chance. The next play lost seven yards, and an incomplete pass to Nathan created **third-and-17**.

Then Olaf made the game''s decisive throw.

He found **Nathan for 19 yards**, moving San Antonio to the Portland 33 and into position to attempt the winning kick.

With **4:38 showing in overtime**, the Outlaws sent out the field-goal unit. The kick was good.

**Final: San Antonio 12, Portland 9 (OT).**

San Antonio had survived two overtime possessions, a dangerous Portland attack and a difficult third-and-17 to claim the West.

## The Players Who Changed the Outcome

Olaf completed **24 of 33 passes for 197 yards**, without a passing touchdown. His biggest contribution came when San Antonio needed a first down rather than six points. Nathan caught **11 passes for 82 yards**, including the seven-yard overtime conversion and the **19-yard third-and-17 completion** that set up the winner.

Bobo''s stat line went far beyond his **42 rushing yards and one touchdown on 15 carries**. He added **three catches for 38 yards**, recovered the key second-quarter Ezekiel fumble, and converted a crucial third down in overtime. He also contributed 22 tackles defensively, making him one of the game''s defining two-way performers.

For Portland, Ezekiel finished with **94 rushing yards on 28 carries** and **four catches for 26 yards**. He had entered with a league-leading **2,412 regular-season rushing yards**, but San Antonio prevented the big gains that had made the Wildfire so difficult to defend. His recovered first-half fumble was a scare; the later fumble recovered by Bobo was a genuine turnover and a major momentum shift.

C Monster completed **17 of 28 passes for 155 yards and a touchdown**, finding Hippo **11 times for 116 yards and a touchdown**. The quarterback and receiver did enough to keep Portland alive through regulation, but a final field-goal attempt was all the Wildfire could produce after their opening-quarter score.

The Outlaws also got important defensive work from Gregg, who registered three tackles for loss. Portland''s Leo contributed two sacks, and Frog made disruptive tackles of his own, but the West title was ultimately decided by San Antonio''s ability to stop Portland where it hurt most—on short-yardage runs and in the red zone.

## Where the Game Was Won and Lost

**Ball security and fourth-down execution were the difference.** San Antonio committed a first-quarter turnover when Bobo''s fumble was recovered by Ezekiel, but Portland answered with an especially damaging turnover of its own when Bobo recovered Ezekiel''s second-quarter fumble. The Wildfire also lost a golden opportunity on fourth-and-3 from the San Antonio 3 in the third quarter.

Those two lost opportunities forced Portland to survive on just one touchdown and one field goal through regulation. Even when the Wildfire tied the game late, their offense failed to produce another sustained drive in overtime.

San Antonio''s decisive possessions looked different: Bobo converted the third-down run that extended the final overtime drive, and Olaf delivered on third-and-17 when failure likely would have meant another punt. The Outlaws were not explosive, but they were better at making the next essential play.

## What It Means for the Championship

San Antonio advances to meet **Nashville Shock**, which won the East Division Championship **24–18 over Richmond** after climbing out of a 15–0 hole. The national championship will pit Nashville''s league-best **9–1–3 regular-season record** against an Outlaws team that finished **7–6** but has now eliminated both Sacramento and Portland.

The teams met once during the regular season. Nashville won **12–6 in Week 7**. Given how this West final unfolded, another low-scoring battle would surprise no one.

Portland exits with plenty of reasons to wonder what might have been. The Wildfire had beaten Nashville during the regular season and possessed the league''s most explosive rushing attack, but those strengths could not overcome an unusually costly day against San Antonio.

## Defining Play

**Olaf to Nathan for 19 yards on third-and-17 in overtime.** After a seven-yard loss left San Antonio facing a long-yardage situation near midfield, Olaf delivered his most important pass of the season. It moved the Outlaws into field-goal range and set up the kick that sent them to the national championship.

Portland''s fourth-down failure at the San Antonio 3 in the third quarter was the other defining moment: the chance to put points on the board that the Wildfire never got back.

## Offensive Player of the Game

**Nathan, San Antonio Outlaws**

**11 receptions, 82 yards.**

In a game that offered few explosive offensive plays, Nathan was the difference between stalled drives and survival. He converted third-and-7 early in overtime, then delivered the 19-yard third-and-17 reception that set up the championship-winning field goal.

## Defensive Player of the Game

**Bobo, San Antonio Outlaws**

**22 tackles, one tackle for loss, one sack, and a recovered fumble**, alongside the winning team''s only touchdown on offense.

Bobo''s recovery of Ezekiel''s second-quarter fumble denied Portland a scoring chance, and his continued defensive workload helped limit the Wildfire to nine points. His contributions on both sides of the ball made him arguably the most consequential player in the West final.

## Summary

San Antonio defeated Portland **12–9 in overtime** to win the West Division Championship. The Outlaws recovered an Ezekiel fumble, stopped him on fourth-and-3 at their own 3, and took a fourth-quarter lead on Bobo''s touchdown. Portland tied the game with 50 seconds remaining, but Olaf''s 19-yard strike to Nathan on third-and-17 set up the winning overtime field goal. San Antonio advances to face Nashville for the AFL title.', '2026-11-25T18:24:07.359Z', 1, NULL),
('2026-playoffs-g70-championship-recap', '97808f43-a0d5-5251-bf8d-fae1643c8258', '62a2553e-d64a-585a-a4f1-56983bcd7824', 'National Championship', NULL, 'game_recap', 'published', 'Koala''s Four Touchdowns Deliver Nashville''s First AFL Championship in 30–18 Victory Over San Antonio', 'Koala scores four touchdowns and rushes for 156 yards as Nashville overcomes a 12–9 halftime deficit, outlasts San Antonio 30–18 and wins the AFL championship. Three 11-play second-half touchdown drives decide the title.', '# Koala''s Four Touchdowns Deliver Nashville''s First AFL Championship in 30–18 Victory Over San Antonio

<div style="background:#101a2d;color:#fff;border-radius:14px;padding:22px 18px;margin:18px 0 24px;text-align:center;">
  <div style="font-size:12px;letter-spacing:2px;font-weight:700;opacity:.8;margin-bottom:16px;">AFL NATIONAL CHAMPIONSHIP · FINAL</div>
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;">
    <div style="flex:1;min-width:0;">
      <img src="https://andrew-jacobson06.github.io/public-audio/outlaw.png" alt="San Antonio Outlaws logo" width="72" height="72" style="object-fit:contain;display:block;margin:0 auto 8px;" />
      <div style="font-size:14px;font-weight:700;">SAN ANTONIO OUTLAWS</div>
      <div style="font-size:38px;font-weight:800;">18</div>
    </div>
    <div style="font-size:13px;font-weight:800;opacity:.7;">FINAL</div>
    <div style="flex:1;min-width:0;">
      <img src="https://andrew-jacobson06.github.io/public-audio/shock.png" alt="Nashville Shock logo" width="72" height="72" style="object-fit:contain;display:block;margin:0 auto 8px;" />
      <div style="font-size:14px;font-weight:700;">NASHVILLE SHOCK</div>
      <div style="font-size:38px;font-weight:800;">30</div>
    </div>
  </div>
  <div style="font-size:13px;font-weight:700;margin-top:14px;">NASHVILLE SHOCK — AFL NATIONAL CHAMPIONS</div>
</div>

**SAN ANTONIO —** Nashville spent most of the regular season proving it could win close games. In the AFL National Championship, the Shock proved they could take one over.

Koala rushed for **156 yards and four touchdowns**, Leon Gory recovered from an uneven first half to direct three decisive second-half scoring drives, and Nashville defeated the San Antonio Outlaws **30–18** to claim the AFL championship. The Shock, who finished the regular season 9–1–3, trailed 12–9 at halftime before overwhelming San Antonio with 15 unanswered points.

For the Outlaws, the defeat was a painful ending to an improbable run. San Antonio had survived Sacramento and upset Portland in overtime to reach the championship. Behind three touchdowns from Bobo, the Outlaws gave Nashville everything it could handle for two quarters. But the same offense that produced long, effective drives in the first half struggled to stay on the field after halftime, leaving Koala and the Shock with too many opportunities.

## San Antonio Sets the Early Pace

Nashville received the opening possession but went three-and-out. Koala gained just five yards on his first two carries, and Leon Gory''s third-down pass to Oliver fell incomplete.

San Antonio''s response was almost the opposite: a **12-play, 70-yard touchdown drive** that consumed nearly six and a half minutes.

Luke helped establish the ground game, while Olaf found SEMC and Nathan for important completions. The Outlaws converted third-and-2 with a nine-yard Bobo run and later kept the possession alive when Olaf connected with Nathan for 13 yards on third-and-8.

Bobo eventually finished the drive with a **9-yard touchdown run at 7:04**, putting San Antonio ahead 6–0.

Nashville had barely touched the football, and the Outlaws had already shown how they intended to win: control possession, stay patient and force the Shock to defend a long field.

That strategy worked for exactly one drive.

Nashville answered in just **four plays, covering 75 yards**. Leon Gory found Barnsworth for 25 yards, Koala picked up 10, and a 22-yard completion to Mini moved the Shock into scoring territory.

Koala finished the possession with an **18-yard touchdown run at 4:55**, tying the game 6–6.

The contrast was striking. San Antonio had needed twelve plays to score; Nashville answered with four. Although the Shock''s opening possession had been ineffective, their second demonstrated how quickly they could erase an advantage.

## A First-Half Fight for Control

Neither offense found an immediate rhythm after the opening touchdowns.

San Antonio''s next possession stalled after Olaf took a five-yard sack, and Nashville followed with another three-and-out. The first quarter ended tied, but the Outlaws made an aggressive decision early in the second that would give Nashville its first lead.

Facing **fourth-and-3 near their own 41**, San Antonio kept the offense on the field. Olaf dropped back and was brought down for a four-yard loss.

Nashville took over in favorable territory and moved inside the San Antonio 10. But the Outlaws'' defense stiffened, limiting Koala to short gains and forcing an incomplete third-down pass.

The Shock settled for a field goal with **11:35 remaining in the second quarter**, taking a 9–6 lead.

San Antonio''s offense then sputtered through consecutive possessions. A three-and-out was followed by a punt after Luke and the short passing game failed to produce enough yardage.

The Outlaws finally regained their footing midway through the quarter, beginning at their own 17.

Luke broke free for **34 yards**, his biggest run of the evening, and added another 13-yard rush on third-and-3. The offense leaned into the same deliberate approach that had worked on its opening possession.

Bobo converted a third-and-1, gained six yards on the next play, and then found the end zone on an **11-yard touchdown run with 3:08 remaining**.

The **10-play, 83-yard drive** restored San Antonio''s lead, 12–9.

Nashville managed just one first down on its next possession, and although San Antonio moved the ball briefly in the final minute, neither team scored again.

**Halftime: San Antonio 12, Nashville 9.**

The Outlaws had executed their plan for much of the first half. Luke was finding productive rushing lanes, Bobo had scored twice, and San Antonio had limited Nashville to a single touchdown.

But something important was developing beneath the score: Nashville was beginning to find consistent gains through Barnsworth, while Koala had already shown he could punish the Outlaws when given room. San Antonio needed its offense to maintain possession after halftime.

It couldn''t.

## Nashville Takes Over the Third Quarter

San Antonio received the second-half kickoff with a chance to stretch its advantage. Instead, Bobo was stopped for no gain, Olaf completed an eight-yard pass to Nathan, and another Bobo run lost two yards.

The Outlaws punted after just four plays.

Nashville took possession and began the drive that changed the championship.

Leon Gory found Barnsworth for **13 yards on third-and-5**, then went back to him for another 15-yard completion. Koala took over from there, gaining **11 yards on consecutive runs** to move deep into San Antonio territory.

Even a sack couldn''t stop the possession. After Gory was dropped for a two-yard loss, Koala gained 11 yards on second-and-12 and then punched in a **7-yard touchdown on third-and-1 with 8:14 remaining**.

The **11-play, 71-yard march** put Nashville ahead 15–12.

The Shock had stopped relying on quick strikes. Instead, they were combining Barnsworth''s third-down production with Koala''s physical running to sustain long possessions.

San Antonio needed an answer, but the Outlaws'' next drive produced only one net yard before another punt.

Nashville went straight back to work.

Starting at its own 34, Leon Gory found Barnsworth for **12 yards on third-and-9**. Later, he connected with the same receiver for another first down and then a **23-yard gain**, moving the Shock into scoring position.

Koala carried for 10 yards, absorbed another setback when Gory took a seven-yard sack, and responded with a 12-yard rush to the San Antonio 2.

With **1:10 left in the third**, Koala scored again.

**Nashville 21, San Antonio 12.**

It was another **11-play touchdown drive**, this one covering 66 yards.

Over its two meaningful third-quarter possessions, Nashville had run **22 offensive plays for 137 yards and two touchdowns**. San Antonio, meanwhile, had managed two punts.

The difference wasn''t one explosive run. It was Nashville''s ability to keep converting and San Antonio''s inability to get off the field.

## The Outlaws'' Fourth-Down Gamble Backfires

Trailing by nine entering the fourth quarter, San Antonio needed urgency. The Outlaws opened the period with the ball but soon faced fourth-and-7 near their own 40.

Olaf attempted a pass to Nathan. It fell incomplete.

The turnover on downs handed Nashville another short field.

The Shock couldn''t find the end zone this time. Koala was stopped for a loss on first down, Leon Gory missed a pass on second, and a nine-yard completion to Barnsworth left Nashville short of the marker.

Still, the field position proved valuable. Nashville kicked a field goal with **11:26 remaining**, stretching its lead to **24–12**.

San Antonio had now surrendered points following two failed fourth-down attempts, and a championship that had been tied or separated by one possession for most of the afternoon was slipping away.

## Bobo Gives San Antonio One Last Chance

The Outlaws weren''t finished.

Olaf scrambled for 10 yards early in the next possession and found SEMC for a 14-yard completion. Luke added a nine-yard run, and Bobo converted a third-and-1 to keep the drive moving.

A 13-yard pass to Nathan moved San Antonio inside the Nashville 20. Then Bobo broke loose for **18 yards**, bringing the offense to the 2-yard line.

He scored on the following snap.

With **7:20 remaining**, San Antonio had completed a **10-play, 75-yard touchdown drive** and narrowed the deficit to **24–18**.

Bobo''s third touchdown gave the Outlaws a path back into the game. Their defense needed one stop, and Olaf would have a chance to tie or win.

But Nashville refused to give him that chance.

## Koala Closes the Championship

Nashville began its next possession at its own 25 with 7:13 remaining.

A nine-yard completion to Barnsworth created third-and-1, and Koala converted it. He then gained 11 yards on first down, moving the ball toward midfield.

San Antonio managed to force third-and-8, but Leon Gory found Barnsworth for **12 yards**, another crucial conversion that kept the clock running.

Koala gained one yard on second-and-2, then broke off a **12-yard run on third-and-1**, moving Nashville inside the red zone.

With **1:37 remaining**, Koala took the next handoff and burst through for a **19-yard touchdown**.

**Nashville 30, San Antonio 18.**

The score was Koala''s fourth touchdown of the game, but the drive itself was just as important. Nashville had traveled **75 yards in 11 plays**, consuming more than five and a half minutes while San Antonio desperately needed possession.

The Shock didn''t merely add insurance points. They effectively ended the game by taking away the Outlaws'' remaining time.

San Antonio moved the ball into Nashville territory on its final possession, but a sack and consecutive incompletions created fourth-and-16 near midfield. Olaf''s final pass to Nathan fell incomplete with 37 seconds remaining.

Leon Gory took a knee.

Nashville was champion.

## The Stars Behind the Championship

### Koala — Championship MVP

**30 carries | 156 rushing yards | 4 rushing touchdowns | 1 catch | 3 receiving yards**

Koala''s performance was a complete illustration of why he had been the AFL''s leading MVP candidate throughout the regular season.

He wasn''t dominant from the opening snap. Nashville''s first drive stalled after two modest carries, and San Antonio''s defense contained him during portions of the second quarter.

But as the game developed, his impact grew. His first touchdown tied the game, his next two scores turned a halftime deficit into a nine-point lead, and his 19-yard fourth-quarter touchdown sealed the championship.

Koala''s best work came when the Outlaws knew he was getting the ball and still couldn''t stop him.

### Leon Gory — The Steady Hand

**17-of-31 passing | 205 yards**

Leon Gory didn''t throw a touchdown pass, but Nashville would not have won without his timely completions.

After a shaky opening possession, he steadily found Barnsworth and Mini to move the chains. In the third quarter, his consecutive completions to Barnsworth were central to both touchdown drives.

His final contribution was perhaps the most important: a third-and-8 completion to Barnsworth during Nashville''s championship-clinching possession.

Gory didn''t need to carry the offense. He needed to keep it moving until Koala could finish.

### Bobo — San Antonio''s Answer

**13 carries | 72 rushing yards | 3 touchdowns**

Bobo was exceptional for San Antonio. All three Outlaws touchdowns came from him, including the fourth-quarter score that brought the game back within six points.

His running provided the finishing touch to San Antonio''s two long first-half scoring drives, and he repeatedly converted manageable third downs.

Luke added **102 rushing yards on 22 carries**, including the 34-yard second-quarter burst that helped San Antonio retake the lead. The running backs gave the Outlaws enough production to compete, but Nashville''s second-half possession advantage left them with too few opportunities.

### Barnsworth — The Difference on Third Down

**9 receptions | 126 receiving yards | 11 tackles | 6 tackles for loss**

Barnsworth was the most consequential receiver in the championship. His 126 yards accounted for more than half of Nashville''s passing production, and several of his catches came on third down during the drives that broke the game open.

His defensive contribution was equally significant. Six tackles for loss repeatedly disrupted San Antonio''s ability to sustain offense, particularly after halftime.

If Koala was the player who finished the drives, Barnsworth was the player who made sure they continued.

## Where the Championship Was Won

San Antonio did not lose because of interceptions or fumbles. Neither team committed a recorded lost fumble or interception.

The Outlaws'' damaging mistakes came on **fourth down**.

Their first failed conversion, early in the second quarter, handed Nashville a short field and led to a field goal. Their second, early in the fourth, gave the Shock another possession in favorable territory, producing three more points. The final failed attempt ended San Antonio''s last chance.

More importantly, Nashville controlled the second half through sustained possessions.

The Shock''s three second-half touchdown drives covered **71, 66 and 75 yards**, each requiring **11 plays**. San Antonio couldn''t consistently force punts, while its own early third-quarter possessions went nowhere.

At halftime, the Outlaws were leading 12–9. By the time Bobo scored to make it 24–18 in the fourth, Nashville had established complete control over the game.

San Antonio had one final opportunity to reverse that momentum.

Koala and Barnsworth made sure it never materialized.

## A Season Belonging to Nashville

The Shock entered the season as one of the AFL''s strongest teams and finished with the league''s best regular-season record at **9–1–3**. Their only defeat came against Portland, a team San Antonio eliminated in the West Division Championship.

Along the way, Nashville survived close games, relied heavily on Koala''s extraordinary rushing production, and demonstrated an ability to win in different ways.

In the East Division Championship, the Shock rallied from a 15–0 deficit against Richmond, scoring 24 unanswered points before surviving a late comeback attempt.

In the National Championship, they faced another halftime deficit. This time, there was no dramatic series of passing touchdowns. Instead, Nashville gradually overwhelmed San Antonio with efficient third-down conversions, long possessions and four touchdowns from its leading runner.

The Outlaws deserve credit for a remarkable postseason. After finishing the regular season 7–6, they eliminated Sacramento, stunned Portland in overtime and led the championship at halftime.

But Nashville was the stronger team over four quarters.

The Shock didn''t need a last-second stop or a miraculous comeback. They needed their best players to control the game when the title was on the line.

Koala delivered four touchdowns. Barnsworth kept the chains moving. Leon Gory managed the offense when it mattered most.

And Nashville finished the season exactly where it spent most of the year: **on top of the AFL.**', '2026-11-25T19:44:21.015Z', 1, NULL);
CREATE TEMP TABLE afl_remaining_22_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_remaining_22_check BEFORE INSERT ON afl_remaining_22_guard
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leagues WHERE id='36c6e53f-7be2-5a94-84a8-0df871aae9fd' AND name='AFL') THEN RAISE(ROLLBACK,'Missing AFL league.') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM seasons WHERE id='97808f43-a0d5-5251-bf8d-fae1643c8258' AND league_id='36c6e53f-7be2-5a94-84a8-0df871aae9fd') THEN RAISE(ROLLBACK,'Import 05 season first.') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2) THEN RAISE(ROLLBACK,'Apply schema upgrade 10 first.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_remaining_22_0 i JOIN articles t ON t.id=i.id WHERE t.season_id IS NOT i.season_id OR t.game_id IS NOT i.game_id OR t.stage IS NOT i.stage OR t.regular_week IS NOT i.regular_week OR t.article_type IS NOT i.article_type OR t.status IS NOT i.status OR t.title IS NOT i.title OR t.summary IS NOT i.summary OR t.markdown IS NOT i.markdown OR t.published_at IS NOT i.published_at OR t.is_featured IS NOT i.is_featured OR t.hero_image_url IS NOT i.hero_image_url) THEN RAISE(ROLLBACK,'articles: existing record differs; no overwrite.') END;
END;
INSERT INTO afl_remaining_22_guard VALUES(1);
INSERT INTO articles (id, season_id, game_id, stage, regular_week, article_type, status, title, summary, markdown, published_at, is_featured, hero_image_url) SELECT i.id, i.season_id, i.game_id, i.stage, i.regular_week, i.article_type, i.status, i.title, i.summary, i.markdown, i.published_at, i.is_featured, i.hero_image_url FROM afl_remaining_22_0 i WHERE NOT EXISTS(SELECT 1 FROM articles t WHERE t.id=i.id);
INSERT INTO import_batches (id, source_filename, source_sha256, importer_version, status, counts_json, reconciliation_json) VALUES
('1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Football Game DB spreadsheet (1).xlsx', 'ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704', 'remaining-snapshot-v1-22-articles', 'imported', '{"articles":19}', '{"note":"19 articles; exact IDs, Markdown including img tags, and publication timestamps retained.","policy":"insert only; identical reruns; no live provider switch","source":"reviewed uploaded snapshot"}') ON CONFLICT(id) DO NOTHING;
INSERT INTO source_record_mappings (id, import_batch_id, source_sheet, source_row, source_legacy_key, target_table, target_id, original_record_json) VALUES
('d12f84ea-584d-536f-a962-98d0d8069d10', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 2, '2026-w01-g1-recap', 'articles', '2026-w01-g1-recap', '{"cells":["2026-w01-g1-recap",1.0,1.0,1.0,"game_recap","published","Ezekiel Erupts for 301 Yards, Three Touchdowns as Portland Wildfire Hold Off Charlotte Kingsmen, 18–12",null,"Portland needed only two offensive snaps to establish what Charlotte would spend the rest of the night trying unsuccessfully to contain.\n\nAfter gaining 4 yards on the first play of the season, Ezekiel broke through the Kingsmen defense for a 71-yard touchdown. By halftime, he had done it again from the same distance. By the end of the night, Portland''s featured runner had piled up **301 yards and three touchdowns on 33 carries**, powering the Wildfire to an **18–12 season-opening victory** over Charlotte.\n\nThe final margin suggested a game that tightened considerably after halftime, and it did. Charlotte recovered from an 18–3 deficit, held Portland scoreless over the final two quarters and reached the end zone on fourth down to make it a one-score game entering the fourth quarter.\n\nBut the damage from Portland''s explosive first half was too substantial to erase.\n\nThe Wildfire finished with **352 rushing yards on 47 carries**, with Ezekiel accounting for more than 85 percent of that production. Charlotte generated **250 yards on 50 carries** and received 159 yards and a touchdown from T''Challa, but the Kingsmen never produced the kind of field-flipping play that Portland repeatedly received from its star runner.\n\nFor both clubs, the game represented a clean start to the season with no prior record or standing separating them. It was also a non-divisional opener, making Portland''s performance less about an immediate division advantage than about establishing an offensive identity.\n\nThat identity took all of 44 seconds to appear.\n\nPortland opened at its own 25. Ezekiel gained 4 yards on first down, then took the next carry 71 yards for a touchdown with **14:16 remaining in the first quarter**. Charlotte had barely settled into the game before it was chasing a 6–0 deficit.\n\nThe Kingsmen responded methodically rather than explosively. T''Challa and Tweety moved Charlotte deep into Portland territory, but the Wildfire stiffened near the goal line. On third-and-8 from the 9, Tigger gained only 4 yards, forcing Charlotte to settle for a field goal with five seconds left in the quarter.\n\nThat made it 6–3 and appeared to restore some balance.\n\nPortland erased that feeling almost immediately.\n\nAfter opening the second quarter with a 2-yard Hippo run and a 2-yard Ezekiel gain, the Wildfire faced **third-and-6 from their own 29**. Ezekiel broke loose again. Seventy-one yards later, Portland had another touchdown and a 12–3 lead.\n\nThe symmetry was remarkable: two 71-yard touchdowns, both beginning from the Portland 29, both arriving before Charlotte could consistently force Ezekiel into the kind of short gains needed to make the Wildfire earn the field a few yards at a time.\n\nCharlotte''s defense did produce disruption. Lil Slushie was particularly effective, recording **six tackles and four tackles for loss**, while Buzz added another stop behind the line. Portland was dropped for a loss five times overall.\n\nThe problem was what happened when Ezekiel escaped that initial penetration.\n\nHis third touchdown came late in the second quarter after Portland had driven deep into Charlotte territory. A 1-yard loss on first down and a modest 3-yard Ezekiel gain left the Wildfire facing third-and-8 from the Charlotte 13. Once again, Portland put the ball in Ezekiel''s hands. He covered all 13 yards for the score and pushed the lead to **18–3 with 3:10 left before halftime**.\n\nCharlotte never stopped competing.\n\nThe Kingsmen opened the second half with another long possession. T''Challa helped move the offense into scoring range, but Portland again prevented a touchdown and forced Charlotte to kick on fourth-and-1. The field goal cut the margin to 18–6.\n\nCharlotte''s defense then did what it had been unable to do consistently in the first half: prevent the catastrophic run. Portland never scored again.\n\nThat gave the Kingsmen a path back into the game.\n\nLate in the third quarter, Charlotte drove inside the Portland 10. A 2-yard loss by T''Challa and a 9-yard Tweety run left the Kingsmen facing **fourth-and-3 from the 3** as the quarter ended. On the first snap of the fourth, Charlotte kept its offense on the field.\n\nT''Challa gained exactly 3 yards and scored, cutting the deficit to **18–12**.\n\nIt was a fitting payoff for Charlotte''s primary offensive weapon. T''Challa finished with **159 yards on 32 carries**, producing 11 rushing first downs and a long gain of 20 yards. Tweety supplied 77 yards on 12 carries, including a 21-yard run, giving the Kingsmen 236 rushing yards from their top two backs.\n\nThe difference was explosiveness.\n\nPortland recorded nine runs of at least 10 yards and two that reached 20, but those totals understate the damage because both of the longest plays traveled 71 yards. Ezekiel alone averaged **9.1 yards per carry**, meaning Charlotte could play sound defense for several snaps and still see an entire drive erased by one mistake.\n\nCharlotte had chances because its defense kept the fourth quarter scoreless. But the Kingsmen were playing from behind because of what happened in the opening half, and Portland had accumulated enough cushion to survive without another point.\n\nThe Wildfire finished the opening week 1–0. Charlotte left 0–1, encouraged by a second-half response but facing an obvious defensive issue after allowing more than 350 rushing yards in its first game.\n\n## Defining Play\n\nCharlotte had just spent most of the first quarter recovering from Ezekiel''s opening 71-yard touchdown and finally cut the score to **6–3** with a field goal in the closing seconds.\n\nPortland''s next possession therefore carried genuine importance. A sustained Charlotte stop could have changed the tone of the game.\n\nInstead, the Wildfire faced **third-and-6 from their own 29 with 13:44 remaining in the second quarter**, handed the ball to Ezekiel and watched him break another 71-yard touchdown.\n\nThe play restored Portland''s nine-point advantage immediately and confirmed that the first long touchdown had not been an isolated breakdown. Charlotte could handle the Wildfire on individual snaps, but it had no answer once Ezekiel reached open space.\n\nHis later 13-yard touchdown created additional separation, but the second 71-yarder was the moment Portland demonstrated that its biggest advantage was repeatable.\n\n## Offensive Player of the Game\n\n**Ezekiel, Portland Wildfire**\n\nThere was no credible alternative.\n\nEzekiel carried **33 times for 301 yards and three touchdowns**, averaging 9.1 yards per attempt while producing scoring runs of **71, 71 and 13 yards**.\n\nPortland''s other runners combined for only 51 yards. Big Boy was next with 21, while C Monster added 19. This was not a case of a dominant rushing system distributing production across an entire backfield. The Wildfire offense revolved around one runner repeatedly creating far more than the play required.\n\nHis explosiveness was also perfectly timed. The first 71-yard run established the game. The second came immediately after Charlotte had cut the margin to three. His third touchdown arrived on third-and-8 and gave Portland the 18 points it ultimately needed to survive Charlotte''s second-half comeback.\n\n## Defensive Player of the Game\n\n**C Monster, Portland Wildfire**\n\nCharlotte successfully moved the football for significant stretches, so Portland''s defensive performance was less about total suppression than timely disruption.\n\nC Monster supplied some of the Wildfire''s most important negative plays, finishing with **three tackles and two tackles for loss**. Portland recorded three tackles for loss as a team, meaning C Monster accounted for two-thirds of them.\n\nThat penetration mattered against a Charlotte offense built around keeping T''Challa moving forward and staying in manageable down-and-distance situations. The Kingsmen still generated 250 rushing yards, but Portland repeatedly tightened when Charlotte approached scoring territory, forcing two field goals before finally conceding a touchdown in the fourth quarter.\n\nBig Boy''s 20 tackles reflected how often Charlotte successfully reached the second level, but C Monster''s ability to stop plays before they developed had greater strategic value in preserving Portland''s early lead.\n\n## Summary\n\nPortland opened its season **1–0 with an 18–12 victory** powered almost entirely by an extraordinary performance from Ezekiel, who rushed for **301 yards and three touchdowns on 33 carries**. Charlotte received 159 yards and a touchdown from T''Challa and held Portland scoreless in the second half, but two separate 71-yard Ezekiel touchdowns helped the Wildfire build an 18–3 advantage that proved too large to erase.","2026-08-11T15:33:00Z",true],"source_row":2,"source_sheet":"Articles"}'),
('fc333bf1-2625-5908-bb96-e875d0942344', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 3, '2026-w01-g2-recap', 'articles', '2026-w01-g2-recap', '{"cells":["2026-w01-g2-recap",1.0,1.0,2.0,"game_recap","published","Koala Runs for 264 Yards as Nashville Shock Overpower Columbus Talons, 21–6",null,"Nashville''s first game of the season quickly became a demonstration of what happens when an opponent knows where the football is going and still cannot consistently stop it.\n\nKoala carried **41 times for 264 yards and a touchdown**, Nashville rushed for **354 yards as a team**, and the Shock opened the year with a convincing **21–6 victory over the Columbus Talons**.\n\nThe result also gave Nashville an immediate divisional win. Both clubs entered the afternoon 0–0, so there was no existing standings hierarchy to upset, but the performance established a clear early contrast: Nashville consistently stayed ahead of the chains while Columbus spent much of the game fighting through negative plays.\n\nThe Shock ran 53 times for 354 yards, averaging 6.7 yards per carry. Columbus managed 176 yards on 42 attempts.\n\nThat **178-yard rushing advantage** told most of the story.\n\nNashville did not immediately turn its superiority into touchdowns. Its opening scoring possession stalled near the Columbus 10 after Mini was dropped for a 4-yard loss. Koala recovered 12 yards on third-and-13, but the Shock still faced fourth-and-1 and settled for a field goal with 9:48 remaining in the first quarter.\n\nThe 3–0 score understated how effectively Nashville was controlling the game.\n\nKoala consistently churned out first downs, and the Shock''s secondary runners ensured Columbus could not focus exclusively on him. Mini finished with **70 yards on only five carries**, while Leon Gory added 21 yards and a touchdown on six attempts.\n\nNashville finally broke through for its first touchdown early in the second quarter.\n\nKoala moved the offense across midfield and into Columbus territory before the Shock turned to Mini. With **14:21 remaining in the second quarter**, Mini took a second-and-9 carry from the Columbus 17 and scored.\n\nThe touchdown made it **9–0** and expanded the problem Columbus faced. Koala could punish the Talons through volume, but Nashville also had enough explosiveness elsewhere in the backfield to turn a crease into points.\n\nThe next Shock touchdown was more representative of the game''s broader pattern.\n\nNashville again leaned on Koala, who repeatedly generated manageable downs and converted third-down situations. With **7:35 remaining before halftime**, the Shock reached second-and-6 from the Columbus 10.\n\nKoala finished the drive himself, scoring from 10 yards out to make it **15–0**.\n\nBy then Nashville had established control at the line of scrimmage. Koala would ultimately produce **15 rushing first downs** by himself. His longest run was 26 yards, meaning his 264-yard performance was not built around one or two statistical outliers. The Shock simply kept handing him the ball and receiving useful yardage.\n\nColumbus'' offense had a much more difficult afternoon.\n\nBlack Dog led the Talons with **84 yards and a touchdown on 22 carries**, while EMC added 73 yards on 13 attempts. But Columbus surrendered **six tackles for loss**, making sustained drives considerably harder.\n\nNashville''s defense repeatedly created those problems before the Talons'' runners could reach the second level. Sloth and Ernie each recorded two tackles for loss, while Leon Gory and Jelly added one apiece.\n\nThat front-line disruption helped Nashville protect its halftime advantage even when Columbus generated occasional positive runs.\n\nThe Talons did not score until the fourth quarter.\n\nColumbus finally assembled its best drive with the game already at 15–0. Black Dog gained 6 yards to set up a manageable third down, EMC converted with a 5-yard run, and Black Dog finished the possession from 4 yards out with **6:29 remaining**.\n\nThe touchdown cut the margin to **15–6** and gave Columbus a late opening.\n\nNashville answered by doing what it had done all game: giving the ball to Koala.\n\nThe Shock moved steadily back down the field, and Koala converted another first down with a 6-yard carry. With 1:31 remaining, Leon Gory scored from 5 yards out to produce the final **21–6** margin.\n\nIt was an appropriate conclusion. Nashville did not need trickery or a sudden change of identity to close the game. The Shock stayed with the rushing attack that had dictated the afternoon from the opening quarter.\n\nKoala''s 41 carries were the clearest indication of that commitment.\n\nColumbus had defensive successes. Doodle recorded two tackles for loss, EMC had a tackle for loss while also carrying a significant offensive workload, and Carl added another stop behind the line. The Talons dropped Nashville runners for losses four times.\n\nThe problem was that those negative plays rarely became extended stops. Koala''s volume and efficiency repeatedly repaired the damage.\n\nNashville produced **19 rushing first downs** and 14 runs of at least 10 yards. Columbus had 12 rushing first downs and only two gains of at least 10 yards.\n\nThe difference was not simply that the Shock ran for more yards. It was that Nashville created explosive gains while also possessing the consistency required to keep drives alive.\n\nFor an opening-week divisional game, that was a significant first statement.\n\n## Defining Play\n\nNashville led 9–0 midway through the second quarter, but Columbus was still within range of one productive possession changing the game.\n\nThe Shock then put together another methodical drive.\n\nKoala converted third-and-4 with a 7-yard run, gained another 4 yards on first down and then took the ball on **second-and-6 from the Columbus 10 with 7:35 left in the half**.\n\nHe scored.\n\nThe 10-yard touchdown made it **15–0** and turned Nashville''s statistical control into a substantial scoreboard advantage. More importantly, the play represented the core problem Columbus could not solve: even after seeing Koala carry the offense repeatedly, the Talons still could not keep him out of favorable situations.\n\nMini''s earlier 17-yard touchdown was the more explosive score. Koala''s touchdown was the one that transformed Nashville''s control into separation.\n\n## Offensive Player of the Game\n\n**Koala, Nashville Shock**\n\nKoala''s workload was massive and his production justified every carry.\n\nHe rushed **41 times for 264 yards and a touchdown**, averaging 6.4 yards per attempt. He generated 15 rushing first downs and posted a long run of 26 yards.\n\nThe most significant part of the performance was its consistency. Koala did not reach 264 because of one enormous touchdown run. Nashville repeatedly used him to move the chains, repair unfavorable downs and keep Columbus'' defense on the field.\n\nMini''s 70 yards on five carries gave the Shock an explosive complement, but Koala was the structure of the offense. Nashville''s 354-yard rushing day does not happen without his ability to absorb 41 attempts while remaining efficient.\n\n## Defensive Player of the Game\n\n**Sloth, Nashville Shock**\n\nNashville''s defensive success was built on forcing Columbus into negative plays, and Sloth was one of the primary reasons.\n\nHe recorded **two tackles, both for loss**, giving him two of Nashville''s six tackles behind the line.\n\nThose stops were particularly valuable because Columbus'' best chance to remain competitive was to lean on Black Dog and EMC. When the Talons stayed on schedule, both runners could produce. When Nashville won first contact in the backfield, the offense had little explosiveness available to recover.\n\nErnie also recorded two tackles for loss, making this a close selection, but Sloth''s repeated disruption best represented a Shock defense that allowed only six points despite Columbus running the ball 42 times.\n\n## Summary\n\nNashville opened the season with a **21–6 divisional victory** behind Koala''s **264 rushing yards and a touchdown on 41 carries**. The Shock outrushed Columbus 354–176, produced 19 rushing first downs and kept the Talons scoreless until the fourth quarter. Columbus received 84 yards and a touchdown from Black Dog, but six tackles for loss repeatedly disrupted its attempts to build sustained drives.","2026-08-13T00:33:00Z",true],"source_row":3,"source_sheet":"Articles"}'),
('cf30e9ec-6958-5629-896b-780269a8e364', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 4, '2026-w01-g3-recap', 'articles', '2026-w01-g3-recap', '{"cells":["2026-w01-g3-recap",1.0,1.0,3.0,"game_recap","published","Blackie Explodes for 231 Yards as Tallahassee Makos Rout Richmond Rebellion, 27–9",null,"Tallahassee''s season began with a warning to the rest of its division.\n\nOn the second offensive snap of the game, Blackie broke free for a 67-yard touchdown. Three quarters later, he had accumulated **231 rushing yards and two scores on 30 carries**, and the Makos had turned their divisional opener against Richmond into a **27–9 victory**.\n\nTallahassee rushed for **345 yards**, produced four rushing touchdowns and never trailed. Richmond generated a respectable 234 yards on the ground, including 193 from Baby, but the Rebellion spent nearly the entire game trying to recover from the explosive play that defined the opening minute.\n\nBoth teams entered their first game 0–0, making this the first meaningful divisional result of their seasons. Tallahassee emerged 1–0 with a performance that combined the league''s most dangerous kind of rushing output: explosive runs at the top of the depth chart and enough supporting production to prevent the defense from selling out against one player.\n\nThe Makos opened with Toad gaining 8 yards on first down.\n\nOn second-and-2 from their own 33, they went to Blackie.\n\nHe covered the remaining **67 yards for a touchdown with 14:18 still left in the first quarter**.\n\nRichmond answered with a competent, patient drive. Baby helped move the Rebellion deep into Tallahassee territory, but the Makos stopped him short on third-and-4 and forced a field goal. Richmond cut the score to 6–3 with 7:58 remaining in the opening period.\n\nThe sequence revealed the difference that would persist all night.\n\nRichmond could move the ball. Tallahassee could change the game in a single play.\n\nThe Makos added another touchdown just before the end of the first quarter. Blackie converted a third-and-1, then gained 5 more yards before Duncan entered the action and scored on a **12-yard run with three seconds remaining**.\n\nTallahassee led **12–3** after one quarter.\n\nRichmond had already allowed two touchdown drives, but Blackie was not the only concern. Duncan''s score demonstrated the depth of a Tallahassee backfield that would eventually receive rushing touchdowns from three different players.\n\nThe second quarter slowed considerably. Tallahassee added a field goal with 8:04 remaining to make it 15–3, and the Makos took that advantage into halftime.\n\nThe score was significant because Richmond had not been completely overwhelmed statistically. Baby was carrying a heavy load and consistently finding moderate gains. He would finish with **193 yards and a touchdown on 35 carries**, an excellent opening-week performance under almost any other circumstance.\n\nBut Richmond needed 45 rushing attempts to accumulate 234 yards. Tallahassee reached 345 on 55.\n\nThat difference came from explosive runs and supporting production.\n\nBlackie''s 67-yarder was the largest play, but the Makos also received 34 yards and a touchdown from Toad, 31 yards and a score from Duncan, 32 from Joey and 17 from Garfield. Blackie was the centerpiece rather than the entire operation.\n\nTallahassee also played the more disruptive defense.\n\nThe Makos produced **four tackles for loss**, led by Bulldog''s three. Richmond had three tackles for loss, including two from Junior, but was unable to consistently prevent Tallahassee from recovering after negative plays.\n\nThe Makos stretched their lead in the third quarter with another example of their willingness to stay aggressive on the ground.\n\nDeep in Richmond territory, Tallahassee faced fourth-and-1 from the 9. Toad gained 4 yards to extend the possession. On the next snap, Blackie carried from the 5 and scored.\n\nThe touchdown with **5:47 remaining in the third quarter** pushed the advantage to **21–3**.\n\nRichmond responded with its best touchdown drive of the game. Baby ripped off a 13-yard run, BMC followed with 8 and Baby scored from 7 yards out with 23 seconds remaining in the quarter.\n\nThe touchdown cut the margin to 21–9.\n\nIt was deserved reward for Baby, who accounted for more than 80 percent of Richmond''s rushing offense. BMC added 41 yards on nine attempts, but Richmond had little production beyond the top two backs.\n\nAny hope that Baby''s touchdown might start a fourth-quarter comeback disappeared when Tallahassee again leaned on the depth of its rushing attack.\n\nThe Makos drove inside the Richmond 10. Joey gained 7 yards, Duncan was stopped for no gain, and Tallahassee faced **third-and-3 from the 6**.\n\nToad scored.\n\nThe 6-yard touchdown with **7:07 remaining** established the final 27–9 margin and capped a game in which Richmond never found a way to make Tallahassee dependent on only one runner.\n\nBlackie remained the overwhelming star. His 231 yards included seven rushing first downs, two touchdowns and the 67-yard sprint that immediately reshaped the game.\n\nBut the Makos'' ability to finish possessions with Duncan and Toad made the offense harder to contain near the goal line.\n\nRichmond''s Baby deserved similar credit in defeat. He produced 11 rushing first downs and averaged 5.5 yards per attempt despite carrying 35 times.\n\nThe difference was that Richmond needed Baby to be nearly everything.\n\nTallahassee did not.\n\n## Defining Play\n\nThe game was only 42 seconds old.\n\nTallahassee had opened with an 8-yard Toad run and faced **second-and-2 from its own 33**. There was no established momentum yet, no scoreboard pressure and no long drive wearing down Richmond''s defense.\n\nBlackie took the handoff and ran **67 yards for a touchdown**.\n\nThe play immediately established Tallahassee''s greatest advantage: Richmond could not afford even one failed fit or missed tackle against Blackie''s speed.\n\nRichmond responded with a field goal and stayed competitive for much of the first half, but the Rebellion spent the entire night chasing the margin created by that first explosive run.\n\nIt was the most spectacular play of the game and the one that defined its competitive direction.\n\n## Offensive Player of the Game\n\n**Blackie, Tallahassee Makos**\n\nBlackie rushed **30 times for 231 yards and two touchdowns**, averaging 7.7 yards per carry.\n\nHis 67-yard touchdown on Tallahassee''s second offensive snap set the tone. His 5-yard third-quarter score came one play after Toad converted fourth-and-1 and expanded the Makos'' lead to 21–3.\n\nBlackie also produced seven rushing first downs and repeatedly turned routine carries into field-position advantages.\n\nBaby''s 193-yard performance for Richmond was outstanding, but Blackie''s production came with greater explosiveness and directly powered the winning offense. Tallahassee outrushed Richmond by 111 yards, and Blackie alone nearly matched the Rebellion''s entire team total.\n\n## Defensive Player of the Game\n\n**Bulldog, Tallahassee Makos**\n\nBulldog was the most disruptive player on a Tallahassee defense that had to handle 45 Richmond rushing attempts.\n\nHe recorded **six tackles and three tackles for loss**, accounting for three of the Makos'' four stops behind the line.\n\nThat disruption was essential against Baby. Richmond''s featured runner consistently generated positive yardage once he reached the second level, so the best way to alter the Rebellion''s offense was to stop plays before they could develop.\n\nBulldog did that more frequently than any defender on the field.\n\nRichmond still accumulated 234 yards, but too many possessions required the Rebellion to recover from negative snaps while already playing from behind. Bulldog''s penetration helped prevent Baby''s strong individual performance from turning into enough scoring drives to threaten Tallahassee''s lead.\n\n## Summary\n\nTallahassee opened its season with a **27–9 divisional win** behind Blackie''s **231 rushing yards and two touchdowns**. His 67-yard score on the Makos'' second offensive snap immediately established control, and Tallahassee eventually rushed for 345 yards with touchdowns from Blackie, Duncan and Toad. Richmond received 193 yards and a touchdown from Baby, but Bulldog''s three tackles for loss and the Makos'' superior explosiveness kept the Rebellion chasing the game throughout.","2026-08-11T15:33:00Z",true],"source_row":4,"source_sheet":"Articles"}'),
('f69b38b5-e4bc-5cd0-a196-d1b623fe2565', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 5, '2026-w01-g4-recap', 'articles', '2026-w01-g4-recap', '{"cells":["2026-w01-g4-recap",1.0,1.0,4.0,"game_recap","published","Milwaukee Forge Win Defensive Grind, Hold Albuquerque Vortex Without a Touchdown in 9–3 Opener",null,"For more than a half, neither Milwaukee nor Albuquerque could turn rushing production into points.\n\nThe difference was that Milwaukee remained patient long enough to finally break through — and its defense never did.\n\nThe Forge held the Vortex without a touchdown, produced **eight tackles for loss** and scored all nine of their points after halftime to escape Albuquerque with a **9–3 divisional victory** in one of Week 1''s most physical games.\n\nMilwaukee rushed for **247 yards on 46 carries**, led by Trunky''s 130 yards and touchdown. Albuquerque finished with 184 yards on 52 attempts, with McGilla accounting for 143 of them.\n\nThose totals indicate how close the matchup remained at the point of attack. Neither team consistently dominated every snap.\n\nThe decisive difference came from negative plays.\n\nMilwaukee dropped Albuquerque runners for a loss eight times. Yankee recorded **four tackles for loss**, GreyBird added three and Trunky contributed another.\n\nThe Vortex produced six tackles for loss of their own, including four from Bevo, and that disruption helped keep the game scoreless through halftime.\n\nBoth clubs entered the divisional opener 0–0, so there was no season trend to confirm or reverse. The game instead became the first evidence of what each team might be: Milwaukee comfortable winning with defense and patience, Albuquerque capable of competing physically but vulnerable when its offense fell behind schedule.\n\nThe opening half was almost entirely about field position and missed opportunities.\n\nMcGilla carried the Albuquerque offense, but repeated penetration prevented the Vortex from building the kind of uninterrupted drives required to reach scoring range. Ming added only 15 yards on 12 attempts, while RBI Bear, Rolf and Skunkers combined for 26.\n\nMilwaukee had more variety.\n\nTrunky handled 27 carries, but McJagger contributed **72 yards on only six attempts**, Dog added 34 and Woodstock supplied 11.\n\nEven with those complementary pieces, the Forge could not score in the first two quarters because Albuquerque''s front was producing nearly as much disruption as Milwaukee''s.\n\nBevo was the centerpiece of that resistance. He finished with 10 tackles and four tackles for loss, repeatedly forcing the Forge to restart possessions after unsuccessful first-down runs.\n\nThe scoreless tie finally broke early in the third quarter.\n\nMilwaukee moved inside the Albuquerque 25 but again encountered resistance. Trunky gained only 1 yard on second-and-5, and Dog was stopped for no gain on third-and-4.\n\nRather than force the issue, the Forge took the points.\n\nThe field goal with **12:15 remaining in the third quarter** gave Milwaukee a **3–0 lead**.\n\nIn a game where possessions were routinely being derailed before runners could reach the second level, three points carried unusual weight.\n\nAlbuquerque now needed to produce a scoring drive against a defense that had spent the first half turning ordinary situations into long-yardage problems.\n\nThe Vortex could not answer before the end of the third quarter.\n\nMilwaukee then created the first truly decisive offensive sequence early in the fourth.\n\nThe Forge began the possession already holding a 3–0 lead. Dog gained 2 yards on first down, setting up second-and-8 from the Albuquerque 28.\n\nMcJagger broke loose for **25 yards**, moving the ball to the 3.\n\nOn the next snap, Trunky scored.\n\nThe touchdown with **13:07 remaining in the fourth quarter** gave Milwaukee a **9–0 advantage** and changed the strategic shape of the game. Albuquerque could no longer hope to win with one scoring possession.\n\nTrunky''s touchdown capped a strong individual night in which he rushed **27 times for 130 yards**, averaging 4.8 yards per carry despite Albuquerque''s six tackles for loss.\n\nMcJagger was even more efficient. His 72 yards came on six attempts, including the 25-yard run that created the game''s only touchdown.\n\nAlbuquerque continued feeding McGilla because little else was working consistently. He finished with **143 yards on 32 carries** and seven rushing first downs.\n\nBut his average of 4.5 yards per attempt was repeatedly offset by losses elsewhere in the offense.\n\nMilwaukee''s pressure was particularly damaging when Albuquerque approached scoring territory. Yankee and GreyBird prevented the Vortex from simply leaning on McGilla and waiting for an eventual crease.\n\nAlbuquerque finally reached the scoreboard midway through the fourth quarter.\n\nThe Vortex moved deep into Milwaukee territory, but Ming lost 3 yards on second-and-7. McGilla gained only 1 on third-and-10, leaving Albuquerque facing fourth-and-9.\n\nThe Vortex kicked the field goal with **5:33 remaining**, cutting the score to **9–3**.\n\nIt was progress, but also another example of Milwaukee''s defense winning when the field shortened. Albuquerque had finally generated a scoring opportunity and still could not reach the end zone.\n\nThe final score accurately reflected the competitiveness of the game. Milwaukee did not dominate Albuquerque in total rushing production, and the Vortex defense repeatedly gave its offense chances.\n\nBut every important offensive possession required Albuquerque to overcome a loss, and the Vortex never produced the explosive answer Milwaukee received from McJagger.\n\nOne 25-yard run did not account for the entirety of a six-point victory.\n\nIt did, however, create the only touchdown in a game where touchdowns were extraordinarily difficult to find.\n\n## Defining Play\n\nMilwaukee led only **3–0 early in the fourth quarter**.\n\nThe Forge faced second-and-8 from the Albuquerque 28 after Dog gained 2 yards on first down. Given the way both defenses had controlled the game, another stalled possession could have left Milwaukee protecting only a field-goal margin.\n\nMcJagger changed that with one run.\n\nHe broke loose for **25 yards**, moving the ball to the Albuquerque 3. On the next snap, Trunky scored the game''s only touchdown.\n\nThe sequence expanded Milwaukee''s lead to **9–0 with 13:07 remaining** and forced Albuquerque to chase multiple scores in a game where the Vortex had not yet scored at all.\n\nTrunky''s touchdown finished the possession, but McJagger''s 25-yard burst was the play that finally broke the defensive stalemate.\n\n## Offensive Player of the Game\n\n**Trunky, Milwaukee Forge**\n\nTrunky carried the heaviest offensive burden in a game where very little came easily.\n\nHe rushed **27 times for 130 yards and the game''s only touchdown**, producing eight rushing first downs and a long gain of 18 yards.\n\nThe absence of a huge breakaway run makes the total more impressive. Albuquerque consistently created penetration — six Milwaukee rushing attempts ended in tackles for loss — but Trunky continued generating enough positive yardage to keep the Forge offense functional.\n\nMcJagger''s 72 yards on six attempts provided the game''s most important explosive play, but Trunky''s workload and fourth-quarter touchdown made him the central figure in Milwaukee''s scoring formula.\n\n## Defensive Player of the Game\n\n**Yankee, Milwaukee Forge**\n\nIn a game defined by defensive penetration, Yankee was the most disruptive defender on the winning side.\n\nHe recorded **five tackles, including four tackles for loss**.\n\nMilwaukee finished with eight tackles for loss as a team, meaning Yankee personally accounted for half of them.\n\nThose negative plays were devastating to an Albuquerque offense so dependent on McGilla. The Vortex had enough rushing production to move the football, but too many drives required them to recover after being pushed backward.\n\nGreyBird also delivered an exceptional performance with three tackles for loss, while Trunky added one. Together, that group ensured Albuquerque never reached the end zone.\n\n## Summary\n\nMilwaukee opened its season with a **9–3 divisional victory** by holding Albuquerque without a touchdown and recording eight tackles for loss. Trunky rushed for **130 yards and the game''s only touchdown**, while McJagger''s 25-yard fourth-quarter run created the decisive scoring opportunity. McGilla carried Albuquerque with 143 yards, but Yankee''s four tackles for loss led a Forge defense that repeatedly forced the Vortex off schedule.","2026-08-11T15:33:00Z",true],"source_row":5,"source_sheet":"Articles"}'),
('1440212e-5124-5bd9-addd-d50522de19a0', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 6, '2026-w01-g5-recap', 'articles', '2026-w01-g5-recap', '{"cells":["2026-w01-g5-recap",1.0,1.0,5.0,"game_recap","published","Bobo''s Three Touchdowns, Luke''s 253 Yards Carry San Antonio Outlaws Past Sacramento Gold Rush, 27–15",null,"San Antonio had the game''s most productive runner. It also had the runner who kept finishing his drives.\n\nThat combination proved too much for Sacramento.\n\nLuke rushed for **253 yards on 37 carries**, Bobo added **124 yards and three touchdowns on 17 attempts**, and the Outlaws piled up **377 rushing yards** in a **27–15 divisional victory** over the Gold Rush.\n\nSacramento did enough offensively to make San Antonio work for the result. Kiwi rushed for 160 yards, and the Gold Rush erased a 15–6 halftime deficit by tying the game in the third quarter.\n\nBut when the game reset at 15–15, San Antonio''s two-headed rushing attack took over again.\n\nBobo scored twice in the fourth quarter, including the go-ahead touchdown with 10:28 remaining, allowing the Outlaws to turn a tie game into a 12-point opening-week win.\n\nBoth teams entered the divisional opener without a previous result, making the game an immediate opportunity to establish position within the West.\n\nSacramento struck first.\n\nKiwi helped move the Gold Rush into San Antonio territory with a 16-yard first-down run. Micro followed with 9, and Moose scored from **14 yards out with 6:43 remaining in the first quarter**.\n\nThe touchdown gave Sacramento a 6–0 lead.\n\nSan Antonio needed barely more than a minute to answer.\n\nLuke was dropped for a 2-yard loss on the Outlaws'' first play of the next possession, then gained 4 on second down. That left San Antonio facing **third-and-8 from its own 27**.\n\nLuke broke free.\n\nHis **73-yard touchdown** tied the score at 6–6 with 5:27 remaining.\n\nIt was the game''s first indication that Sacramento''s defensive success behind the line would not necessarily translate into control. The Gold Rush eventually recorded **six tackles for loss**, including four from Percy and two from Kiwi.\n\nBut San Antonio could lose a few yards on one snap and erase the entire field on the next.\n\nThe Outlaws took their first lead midway through the second quarter after marching to the Sacramento 1. Luke was stopped just short on consecutive plays before Bobo scored on **third-and-1**.\n\nThe 1-yard touchdown made it 12–6.\n\nSan Antonio added a field goal in the final minute of the half, carrying a **15–6 advantage** into the break.\n\nThe nine-point margin did not reflect a game Sacramento was prepared to surrender.\n\nKiwi continued to handle the bulk of the Gold Rush offense. He finished with **160 yards on 28 carries**, producing nine rushing first downs and repeatedly keeping Sacramento in manageable situations.\n\nThe Gold Rush opened the third-quarter scoring with a field goal, trimming the margin to 15–9.\n\nLater in the quarter, Sacramento completed the comeback.\n\nKiwi helped move the ball inside the San Antonio 10, but consecutive 1-yard gains left the Gold Rush facing **third-and-8 from the 9**.\n\nInstead of going back to Kiwi, Sacramento turned to Micro.\n\nHe scored from 9 yards out with **3:11 remaining in the third quarter**, tying the game **15–15**.\n\nAt that point, Sacramento had successfully absorbed Luke''s 73-yard touchdown and San Antonio''s 15 first-half points. The game had effectively restarted.\n\nWhat followed separated the teams.\n\nSan Antonio returned to Luke and Bobo.\n\nLuke''s value was not limited to the early 73-yard touchdown. He repeatedly carried the Outlaws between scoring areas, while Bobo became the finisher.\n\nEarly in the fourth quarter, Luke gained 6 yards and then converted a first down with a 5-yard run, moving San Antonio to the Sacramento 2.\n\nBobo scored from there with **10:28 remaining**.\n\nThe touchdown restored San Antonio''s lead at **21–15**.\n\nSacramento still had time, but the Gold Rush could not match the Outlaws'' ability to sustain production without being derailed by negative plays.\n\nThat was particularly notable because Sacramento''s defense was creating more backfield disruption than San Antonio''s. Percy had four tackles for loss, and Kiwi added two while also carrying 28 times on offense.\n\nSan Antonio recorded only one tackle for loss defensively.\n\nYet the Outlaws were the team better equipped to overcome lost-yardage snaps.\n\nLuke averaged 6.8 yards per carry. Bobo averaged 7.3. Together they accounted for **377 rushing yards**, exactly matching San Antonio''s entire team rushing total outside of Olaf''s net-zero contribution.\n\nSacramento finished with a solid **246 rushing yards on 40 carries**. Kiwi led the way, Moose added 43 yards and a touchdown on five attempts, and Micro contributed 39 yards and another score.\n\nThose are winning-caliber numbers in many games.\n\nThey were not enough against an Outlaws offense that produced 20 rushing first downs and 10 gains of at least 10 yards.\n\nSan Antonio finally created separation late in the fourth.\n\nWith Sacramento still trailing 21–15, Luke gained 10 yards and then 11 more on consecutive first-down carries, moving the Outlaws inside the 5.\n\nBobo finished the drive from **5 yards out with 3:07 remaining**, scoring his third touchdown and making it **27–15**.\n\nThe touchdown ended Sacramento''s realistic comeback opportunity.\n\nLuke had supplied the field position. Bobo supplied the points.\n\nIt was a complementary relationship Sacramento never completely solved.\n\nThe Gold Rush could penetrate and create negative plays. Percy in particular repeatedly disrupted San Antonio near the line of scrimmage.\n\nBut every defensive victory carried the possibility of being undone by one Luke run. And once San Antonio reached short-yardage territory, Bobo was consistently effective enough to finish.\n\nThe result left the Outlaws 1–0 with a divisional victory and one of Week 1''s most productive rushing performances.\n\nSacramento fell to 0–1 despite 160 yards from Kiwi and a comeback that briefly erased a nine-point halftime deficit.\n\n## Defining Play\n\nSacramento had just completed the game''s biggest momentum swing.\n\nThe Gold Rush entered halftime down 15–6, scored nine unanswered points in the third quarter and tied the game **15–15** on Micro''s 9-yard touchdown.\n\nSan Antonio''s response determined whether the comeback would change control of the game.\n\nEarly in the fourth quarter, Luke carried the Outlaws into the red zone. He gained 6 yards and followed with a 5-yard first down, moving the ball to the Sacramento 2.\n\nOn the next snap, **Bobo scored from 2 yards out with 10:28 remaining**.\n\nThe touchdown made it **21–15** and immediately restored San Antonio''s control after Sacramento had spent an entire quarter fighting back.\n\nBobo would score again later, but the first fourth-quarter touchdown was the play that prevented the Gold Rush comeback from ever becoming a lead.\n\n## Offensive Player of the Game\n\n**Luke, San Antonio Outlaws**\n\nBobo scored three touchdowns and deserves enormous credit for finishing drives, but Luke was the player who fundamentally changed the geometry of the game.\n\nHe rushed **37 times for 253 yards and a touchdown**, averaging 6.8 yards per attempt and producing 11 rushing first downs.\n\nHis 73-yard touchdown on third-and-8 answered Sacramento''s opening score almost immediately. Beyond that explosion, Luke repeatedly moved San Antonio into positions where Bobo could finish.\n\nThe late sequence that set up Bobo''s final touchdown captured the partnership: Luke gained 10 and 11 yards on consecutive carries, moving San Antonio deep into Sacramento territory before Bobo scored from 5.\n\nBobo''s **124 yards and three touchdowns** made this one of the strongest two-runner performances of the opening week, but Luke''s 253 yards were the foundation.\n\n## Defensive Player of the Game\n\n**Percy, Sacramento Gold Rush**\n\nThe game''s most disruptive defensive performance came from the losing side.\n\nPercy recorded **seven tackles and four tackles for loss**, consistently giving Sacramento opportunities to get San Antonio behind schedule.\n\nThe Gold Rush finished with six tackles for loss, and Percy accounted for four of them. Against almost any ordinary rushing performance, that level of disruption could have controlled the game.\n\nSan Antonio was simply too explosive once it escaped the backfield.\n\nLuke''s 73-yard touchdown demonstrated the problem perfectly: Sacramento could create a negative play on one snap and give up the entire field two plays later.\n\nPercy''s impact kept Sacramento competitive and helped give the Gold Rush enough possessions to erase a 15–6 halftime deficit, even though the defense ultimately could not contain Luke and Bobo for four quarters.\n\n## Summary\n\nSan Antonio opened the season with a **27–15 divisional victory** behind one of Week 1''s strongest backfield performances. Luke rushed for **253 yards and a touchdown**, while Bobo added **124 yards and three scores** as the Outlaws finished with 377 rushing yards. Sacramento tied the game 15–15 in the third quarter behind Kiwi''s 160-yard performance and touchdowns from Moose and Micro, but Bobo scored twice in the fourth quarter to restore and then extend San Antonio''s lead.","2026-08-11T15:33:00Z",true],"source_row":6,"source_sheet":"Articles"}'),
('35bd80f7-7998-53b1-9586-64b93cd87c53', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 7, '2026-w02-clt-tal-recap', 'articles', '2026-w02-clt-tal-recap', '{"cells":["2026-w02-clt-tal-recap",1.0,2.0,6.0,"game_recap","published","Tweety’s Two Touchdowns, Late Safety Lift Charlotte Kingsmen Past Tallahassee Makos, 20–15",null,"Charlotte did not need to completely stop Blackie to beat Tallahassee. The Kingsmen needed to make everybody else work harder, create enough negative plays to keep the Makos from finishing drives and find their own source of explosiveness.\n\nTweety supplied the latter, and Charlotte’s defensive front handled the rest.\n\nTweety rushed for **132 yards and two touchdowns on 15 carries**, including a 39-yard third-quarter score, and the Kingsmen produced a critical safety with 2:16 remaining to hold off the Makos **20–15**. Charlotte evened its record at **1–1** after opening the season with an 18–12 loss at Portland, while Tallahassee fell to **1–1** after entering the night with one of the East’s strongest Week 1 results, a 27–9 victory over Richmond.\n\nThe contrast from the opening week was significant. Charlotte had allowed Portland to rush for **352 yards** in its opener, including 301 from Ezekiel. Tallahassee, meanwhile, had run for **345 yards** against Richmond behind Blackie’s 231-yard performance. That made the matchup appear particularly dangerous for a Kingsmen defense that had already been gashed once.\n\nBlackie was still outstanding. He carried **33 times for 180 yards and a touchdown**. But Charlotte limited the rest of Tallahassee’s offense to **51 rushing yards on 23 attempts** and repeatedly forced the Makos to overcome losses before they could reach the open field. Tallahassee surrendered **nine tackles for loss**, three apiece to Lil Slushie and BlackBird, while Charlotte’s offense encountered only five.\n\nThat difference in consistency helped explain why the Kingsmen could survive a game that remained competitive until the final minutes.\n\nCharlotte established its approach immediately. The Kingsmen took the opening possession at their own 25 and ran the ball 12 consecutive times over a **75-yard touchdown drive**. T’Challa did most of the early work, including a 29-yard burst on third-and-11, while Rat added a 10-yard conversion before Tweety finished the march with a **3-yard touchdown with 7:54 left in the first quarter**.\n\nIt was a revealing opening statement. Charlotte was not simply trying to ride one runner. T’Challa handled the volume, Tweety supplied speed and the offensive line repeatedly created enough space to stay ahead of the chains.\n\nTallahassee’s first answer stalled when consecutive losses of 1 and 4 yards put Blackie and the Makos behind schedule. They punted, and although Charlotte also went three-and-out on its next possession, the Kingsmen had already demonstrated the formula that would carry them through the night: force Tallahassee to string together long drives while relying on a deeper rushing rotation of their own.\n\nThe Makos finally broke through early in the second quarter. Blackie’s **32-yard run on third-and-7** moved Tallahassee deep into Charlotte territory, but the Kingsmen tightened from there. Joey was dropped for a 2-yard loss, and the Makos settled for a field goal to make it **6–3**.\n\nThat sequence became a recurring theme. Blackie could flip the field, but Charlotte prevented too many of his explosive runs from becoming touchdowns.\n\nThe Kingsmen answered with a field-goal drive highlighted by Tweety’s **35-yard run**, then added another three points late in the half. Charlotte therefore carried a **12–3 lead** despite scoring only one first-half touchdown. The difference was drive completion: when the Kingsmen reached scoring range, they consistently came away with points, while Tallahassee spent too much of the half fighting through second- and third-and-long situations created by penetration up front.\n\nTallahassee finally converted its rushing success into a touchdown with **8:21 remaining in the third quarter**. The possession had actually begun in the final minute of the first half and stretched 17 plays. Blackie did most of the damage after intermission, ripping off gains of 23, 11 and 10 yards before scoring from 9 yards out.\n\nThe drive cut Charlotte’s lead to **12–9** and represented the Makos at their best: patient enough to continue feeding Blackie and physical enough to survive several unfavorable down-and-distance situations.\n\nCharlotte’s response was immediate and decisive.\n\nThe Kingsmen drove from their own 25, converting three separate third downs. With **2:08 left in the third quarter**, they faced third-and-8 from the Tallahassee 39. Tweety broke through the first wave, escaped into the secondary and went the full **39 yards for his second touchdown**.\n\nThe play pushed the margin back to **18–9** and underscored why Charlotte’s backfield presented Tallahassee with a different problem than it had faced in Week 1. T’Challa carried **32 times for 123 yards**, giving the Kingsmen a dependable interior workload, but Tweety transformed those steady gains into points. Charlotte finished with **308 rushing yards on 56 carries**, with Tigger adding 34 yards on five attempts and Rat contributing 10 yards on his lone rush.\n\nThat balance mattered because Tallahassee’s defense did occasionally win at the line. Bulldog and Toad each made two tackles for loss, and Duncan added another. But Charlotte repeatedly recovered from those setbacks because its runners produced **seven gains of at least 10 yards and three of at least 20**.\n\nTallahassee had one more push.\n\nTrailing 18–9 in the fourth quarter, the Makos began at their own 31 and marched **69 yards over 14 plays**. Blackie converted gains of 11 and 8 yards, and Toad supplied two of the drive’s biggest plays — a 7-yard conversion on fourth-and-3 and a 13-yard run that put Tallahassee at the Charlotte 1. After Toad was dropped for a 1-yard loss, Duncan scored from 2 yards out with **6:04 remaining**.\n\nSuddenly it was **18–15**.\n\nCharlotte could not put the game away on its ensuing possession. The Kingsmen reached midfield but eventually punted, giving Tallahassee another opportunity with the margin still only three.\n\nThat was when the game turned for good.\n\n## Defining Play\n\nWith **2:16 remaining**, Tallahassee took over backed up at its own 3-yard line, trailing 18–15. The Makos had just produced a 14-play touchdown drive on their previous possession and needed only a field goal to potentially erase what had once been a nine-point second-half deficit.\n\nInstead, Charlotte’s defensive line overwhelmed the play immediately.\n\nOn first-and-10, Toad took the handoff and was driven backward. **Lil Slushie finished the play in the end zone for a 3-yard loss and a safety**, extending Charlotte’s lead to **20–15**.\n\nThe five-point margin changed the entire endgame. Tallahassee no longer had a path to tie the score with a field goal, and Charlotte regained possession after the safety. Even though the Kingsmen did not record another first down, the clock was reduced to 18 seconds before the Makos got the ball again.\n\nTallahassee’s final snap was a 1-yard Blackie run. The comeback was over.\n\n## Offensive Player of the Game\n\n**Tweety, Charlotte Kingsmen**\n\nT’Challa was the engine of Charlotte’s offense, carrying 32 times, but Tweety was its difference-maker.\n\nHe finished with **132 yards and two touchdowns on only 15 attempts**, an average of **8.8 yards per carry**. His first score capped Charlotte’s methodical 12-play opening drive. His second came from 39 yards on third-and-8 just after Tallahassee had pulled within 12–9, immediately restoring control to the Kingsmen.\n\nTweety also supplied a 35-yard run that set up Charlotte’s first field goal and a 16-yard gain during another scoring opportunity. His ability to create explosive yardage kept the Kingsmen from becoming dependent on long, grinding possessions and gave Charlotte the complementary threat it lacked in a Week 1 loss when its offense was outproduced on the ground by Portland.\n\n## Defensive Player of the Game\n\n**Lil Slushie, Charlotte Kingsmen**\n\nBlackie’s 180 yards make clear that Charlotte did not shut down the Makos’ primary runner. What Lil Slushie and the Kingsmen did instead was consistently wreck the structure around him.\n\nLil Slushie recorded **seven tackles and three tackles for loss**, tied for the team lead in tackles behind the line. He was particularly effective when Tallahassee tried to establish other runners or when the Makos were forced into unfavorable situations. Charlotte held Joey to 19 yards on nine carries, Toad to 22 on eight and Duncan to seven on five.\n\nHis biggest contribution, however, came with the entire game still undecided. The safety with 2:16 left turned an 18–15 game in which Tallahassee needed only a field goal into a 20–15 game that required a touchdown, while also taking the ball away from the Makos at the worst possible time.\n\nCharlotte’s defense allowed **231 rushing yards**, but it produced **nine tackles for loss** and made enough drive-killing plays to prevent Tallahassee’s ground production from translating into more points. No defender embodied that pattern more than Lil Slushie.\n\n## Summary\n\nCharlotte answered a season-opening loss with a **20–15 victory** built on 308 rushing yards, Tweety’s 132-yard, two-touchdown performance and a disruptive defensive front. Tallahassee remained dangerous behind Blackie’s 180 rushing yards, but nine tackles for loss repeatedly stalled the Makos, and Lil Slushie’s safety with 2:16 remaining provided the final separation in an East matchup that left both teams at 1–1.","2026-08-13T00:33:00Z",true],"source_row":7,"source_sheet":"Articles"}'),
('728e9894-760d-53f2-9ac4-07040640f846', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 8, '2026-w01-power-rankings', 'articles', '2026-w01-power-rankings', '{"cells":["2026-w01-power-rankings",1.0,1.0,null,"power_rankings","published","Way-Too-Early Power Rankings: Tallahassee Claims No. 1 After Statement Week 1","Tallahassee opens at No. 1 after a dominant 27–9 divisional win, followed by San Antonio and Nashville. Portland owns Week 1’s most spectacular individual performance, Milwaukee has the strongest early defensive identity, and several 0–1 teams remain closer to the middle than their records suggest.","One week is enough to produce evidence. It is not nearly enough to produce certainty.\n\nThat is the entire point of the first power rankings of the season.\n\nFive teams are 1–0 and five are 0–1, but the opening week already gave us very different kinds of performances: overwhelming rushing attacks, suffocating defensive fronts, superstar individual efforts and a few losses that looked considerably better than the final record suggests.\n\nTallahassee, San Antonio and Nashville all made convincing claims to the top spot. Portland may have produced the most spectacular individual performance of the week. Milwaukee won a completely different kind of game, while Charlotte and Sacramento both showed enough in defeat to remain within striking distance of the winning half of the league.\n\nSo, with the necessary reminder that these are **way-too-early** rankings, here is where the league stands after Week 1.\n\n## 1. Tallahassee Makos — 1-0\n\nNo team combined offense, margin and defensive control as convincingly as Tallahassee.\n\nThe Makos beat Richmond **27–9**, rushed for **345 yards** and never trailed. Blackie immediately announced himself as one of the league’s premier offensive players with **231 yards and two touchdowns on 30 carries**, including a 67-yard touchdown on Tallahassee’s second offensive snap.\n\nWhat pushes the Makos to No. 1 is that the offense was not completely dependent on him. Toad, Joey, Duncan and Garfield combined for 114 additional rushing yards, while Duncan and Toad also scored touchdowns. On defense, Bulldog recorded three tackles for loss and Tallahassee kept Richmond from turning Baby’s excellent 193-yard rushing day into enough points to threaten the game.\n\nOne week in, Tallahassee looks explosive, deep and capable of finishing drives.\n\n## 2. San Antonio Outlaws — 1-0\n\nIf the rankings were based purely on offensive ceiling, San Antonio might already be No. 1.\n\nThe Outlaws rushed for a Week 1-best **377 yards** in a **27–15 win over Sacramento**. Luke carried 37 times for **253 yards and a touchdown**, while Bobo added **124 yards and three scores on 17 attempts**.\n\nJust as important, San Antonio responded when Sacramento made the game uncomfortable. The Gold Rush erased a 15–6 halftime deficit and tied the score 15–15 in the third quarter. The Outlaws answered with two fourth-quarter Bobo touchdowns.\n\nThe only reason San Antonio sits second is defense. Sacramento still ran for 246 yards. If that side of the ball catches up to the Luke-Bobo backfield, the Outlaws may not stay at No. 2 for long.\n\n## 3. Nashville Shock — 1-0\n\nNashville’s opening performance may have been the most complete domination of the line of scrimmage.\n\nThe Shock beat Columbus **21–6** and held a **354–176 advantage in rushing yards**. Koala carried 41 times for **264 yards and a touchdown**, repeatedly keeping Nashville ahead of the chains without relying on one enormous breakaway. Mini added 70 yards on only five attempts.\n\nThe defense was just as encouraging. Nashville produced six tackles for loss and kept Columbus scoreless until the fourth quarter.\n\nTallahassee gets the edge because of the larger scoring margin, and San Antonio owns the league’s most explosive two-back combination. But Nashville already looks built to control games for four quarters.\n\n## 4. Portland Wildfire — 1-0\n\nPortland owns the most frightening question any defense has to answer after Week 1: what exactly are you supposed to do with Ezekiel?\n\nThe Wildfire runner produced the week’s signature individual performance with **301 yards and three touchdowns on 33 carries** in an 18–12 victory over Charlotte. His first two touchdowns both traveled 71 yards.\n\nPortland finished with **352 rushing yards**, giving the Wildfire a statistical profile comparable to the teams above them.\n\nThe concern is what happened after halftime. Charlotte held Portland scoreless over the final two quarters and turned an 18–3 deficit into an 18–12 game. Ezekiel was extraordinary, but the rest of the Wildfire rushing attack combined for only 51 yards.\n\nPortland is undefeated and has the league’s most devastating individual weapon through one week. The next question is whether the Wildfire can win when an opponent finally contains him.\n\n## 5. Milwaukee Forge — 1-0\n\nMilwaukee is the hardest 1–0 team to compare with the others because its opener looked nothing like the league’s offensive showcases.\n\nThe Forge beat Albuquerque **9–3**, held the Vortex without a touchdown and produced **eight tackles for loss**. Yankee recorded four of them, GreyBird added three and Milwaukee repeatedly turned manageable Albuquerque situations into long-yardage problems.\n\nOffensively, Trunky carried 27 times for **130 yards and the game’s only touchdown**, while McJagger supplied 72 yards on six attempts and broke the 25-yard run that set up that score.\n\nNine points leaves questions about offensive ceiling, but there is something reassuring about already knowing Milwaukee can win a low-scoring game with defense.\n\n## 6. Charlotte Kingsmen — 0-1\n\nThe first losing team in the rankings also produced the most encouraging loss.\n\nCharlotte fell **18–12 at Portland**, but the Kingsmen were down 18–3 before holding the Wildfire scoreless for the entire second half. T’Challa rushed for **159 yards and a touchdown on 32 carries**, Tweety added 77 on 12 attempts and Charlotte finished with **250 rushing yards**.\n\nThe obvious problem is impossible to ignore: the Kingsmen allowed 352 rushing yards and watched Ezekiel run for 301 by himself.\n\nStill, Charlotte showed more resistance than the other Week 1 losers. The offense stayed functional, the defense adjusted after halftime and the Kingsmen had a one-score game in the fourth quarter after appearing headed for a blowout.\n\n## 7. Sacramento Gold Rush — 0-1\n\nSacramento deserves more credit than a 12-point loss usually receives.\n\nThe Gold Rush fell **27–15 to San Antonio**, but they erased a nine-point halftime deficit and tied the game 15–15 in the third quarter. Kiwi rushed for **160 yards on 28 carries**, while Moose and Micro both scored touchdowns.\n\nSacramento also produced six tackles for loss, including four from Percy.\n\nThe issue was surviving once San Antonio’s runners escaped the backfield. Luke’s 73-yard touchdown was the most obvious example, and the Gold Rush eventually surrendered 377 rushing yards.\n\nSacramento is 0–1, but this did not look like one of the league’s weakest teams.\n\n## 8. Richmond Rebellion — 0-1\n\nThere is a strange tension in Richmond’s opener.\n\nThe Rebellion lost **27–9**, the largest defeat of Week 1, yet Baby rushed for **193 yards and a touchdown on 35 carries** and Richmond still produced 234 rushing yards against the team sitting atop these rankings.\n\nThe problem was that Tallahassee consistently produced the bigger play and finished more drives. Blackie’s 67-yard touchdown immediately put Richmond behind, and the Makos had enough additional weapons to prevent the Rebellion from concentrating solely on him.\n\nRichmond has something real to build around in Baby. The ranking stays low because a productive rushing total cannot erase an 18-point divisional loss.\n\n## 9. Albuquerque Vortex — 0-1\n\nAlbuquerque’s defense played well enough to give the Vortex a chance. The offense never rewarded it.\n\nThe **9–3 loss to Milwaukee** was scoreless at halftime, and Bevo produced **four tackles for loss** as Albuquerque’s defense repeatedly disrupted the Forge rushing attack.\n\nMcGilla also provided legitimate offensive production with **143 yards on 32 carries**.\n\nEverything around him was the problem. Albuquerque finished with only 184 rushing yards as a team, meaning the rest of the offense combined for just 41. Milwaukee produced eight tackles for loss and kept the Vortex out of the end zone for the entire game.\n\n## 10. Columbus Talons — 0-1\n\nSomeone has to start at the bottom, and after one week it is Columbus.\n\nThe Talons lost **21–6 to Nashville**, were outrushed **354–176** and did not score until the fourth quarter. Black Dog led the offense with 84 yards and a touchdown on 22 carries, while EMC added 73 yards on 13 attempts.\n\nThose individual numbers are respectable. The overall offensive profile was not. Columbus managed only two runs of at least 10 yards and surrendered six tackles for loss, allowing Nashville to dictate down-and-distance throughout the afternoon.\n\nIt is only Week 1, but compared with the other winless teams, Columbus showed the least ability to either threaten explosively or control the game defensively.\n\n## The Week 1 Takeaway\n\nThe top of the league already has distinct identities.\n\nTallahassee looks like the most balanced contender. San Antonio owns the most explosive backfield. Nashville may be the most methodical team in the league. Portland has the individual player nobody wants to see in open space. Milwaukee appears perfectly comfortable winning with defense.\n\nThe more interesting question may be how quickly the bottom half can close the gap.\n\nCharlotte and Sacramento already looked competitive enough to move dramatically with one win. Richmond has a 193-yard runner to build around. Albuquerque has a defense capable of keeping games close. Columbus gets the first opportunity to prove that one difficult afternoon against Nashville was not a permanent identity.\n\nThese rankings will probably look foolish soon. That is what makes the first edition fun.","2026-08-13T17:40:00Z",true],"source_row":8,"source_sheet":"Articles"}'),
('921610f1-0ff9-53f5-a924-265f241ea2f8', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 9, '2026-w02-ric-nas-recap', 'articles', '2026-w02-ric-nas-recap', '{"cells":["2026-w02-ric-nas-recap",1.0,2.0,7.0,"game_recap","published","Koala Runs Wild Again as Nashville Shock Bury Richmond Early, Cruise to 24–9 Divisional Win",null,"For the second straight week, Nashville gave an East opponent the same problem to solve.\n\nFor the second straight week, nobody came particularly close to solving it.\n\nKoala rushed for **250 yards and three touchdowns on 31 carries**, Nashville piled up **350 rushing yards**, and the Shock jumped on Richmond from the opening snap before cruising to a **24–9 divisional victory**.\n\nThe win moves Nashville to **2–0**, while Richmond falls to **0–2** after beginning its season with consecutive divisional losses.\n\nWhat makes Nashville''s start particularly imposing is how repeatable it already looks. The Shock rushed for 354 yards in a 21–6 Week 1 victory over Columbus. One week later, they generated 350 more while increasing their scoring output to 24 points.\n\nKoala has been the centerpiece of both performances. After carrying 41 times for 264 yards against Columbus, he somehow became even more explosive with a lighter workload against Richmond, averaging **8.1 yards per carry** and scoring all three Nashville touchdowns.\n\nThe tone was established immediately.\n\nNashville received the opening possession at its own 25. There was no methodical drive, no feeling-out period and no need to establish anything over multiple snaps.\n\nKoala took the first offensive play **75 yards for a touchdown**.\n\nWith 15:00 showing on the first-quarter clock, Richmond was already behind 6–0.\n\nFor a Rebellion team attempting to recover from a 27–9 Week 1 loss to Tallahassee, it was nearly the worst possible beginning. Richmond had allowed Blackie to score from 67 yards on Tallahassee''s second offensive snap the previous week. Seven days later, another premier East runner needed only one play.\n\nRichmond''s first possession initially offered some resistance. Baby gained 6 yards twice to move the chains, but Nashville''s defensive front quickly took over. Sloth dropped BMC for a 2-yard loss, then stopped Baby for another loss on third-and-11, forcing the Rebellion to punt.\n\nThat combination — Koala creating explosive offense while Nashville''s front created negative plays — defined the game.\n\nAfter Richmond''s punt, the Shock went back to work.\n\nMini converted third-and-5 with an 8-yard run. Koala later gained 10 on second-and-8, and Mini added another 8-yard conversion on third-and-6. Nashville eventually faced third-and-2 at the Richmond 30.\n\nKoala broke through for **22 yards**, putting the Shock at the 8.\n\nOn the next snap, he scored.\n\nThe **8-yard touchdown with 4:31 remaining in the first quarter** pushed Nashville''s lead to 12–0 and made the opening period feel less like an early advantage than the beginning of another divisional rout.\n\nRichmond could not answer.\n\nThe Rebellion''s next possession produced only five net yards before another punt. Nashville briefly stalled as well, punting late in the first quarter, but Richmond''s offense continued to fight through penetration.\n\nThat was a significant change from Week 1.\n\nBaby had rushed for **193 yards on 35 carries** against Tallahassee despite Richmond''s loss. He had been one of the few unquestioned positives from the opener.\n\nNashville made sure there would be no repeat performance.\n\nBaby finished Week 2 with **102 yards and a touchdown on 26 carries**, but even that total required a late fourth-quarter surge. For much of the afternoon, he was repeatedly being forced to restart plays after Nashville won at the line of scrimmage.\n\nSloth was at the center of it.\n\nNashville ultimately recorded **nine tackles for loss**, with Sloth producing five of them by himself. Ernie added three more and Barnsworth another.\n\nRichmond''s entire offense finished with only **165 rushing yards on 42 attempts**, a substantial decline from the 234 yards it produced against Tallahassee.\n\nMeanwhile, Nashville continued operating with remarkable consistency.\n\nThe Shock''s third touchdown drive came late in the second quarter and demonstrated that the offense could be effective even when Koala was not producing a 75-yard explosion.\n\nMini gained 4 to begin the possession. Koala converted third-and-4 with a 6-yard run. Leon Gory followed with 7, and Junior — used as a runner — broke off a 12-yard gain.\n\nKoala then supplied a 14-yard first down before Leon Gory converted another third down.\n\nThe drive eventually reached the Richmond 2 after Mini gained 8 yards on third-and-2.\n\nKoala finished it from there.\n\nHis **2-yard touchdown with 3:48 remaining before halftime** made it **18–0**.\n\nBy that point, Richmond had already spent most of the half defending a Nashville rushing attack that could attack in several different ways. Mini finished with **52 yards on eight carries**, Leon Gory added 28 on nine attempts, Junior gained 12 on his only rush and Ernie and Oliver contributed additional yardage.\n\nNone approached Koala''s production, but they did not need to. Their value was in preventing Richmond from treating every Nashville snap as though only one runner mattered.\n\nThe Shock added a field goal with five seconds left in the half to take a **21–0 lead** into the locker room.\n\nRichmond had been shut out for 30 minutes.\n\nThe Rebellion finally generated their best offensive stretch to open the third quarter.\n\nBaby gained 4 and 5 yards before converting third-and-1. BMC then produced consecutive first-down runs of 12 and 7 yards, and Baby later broke a 9-yard gain that moved Richmond deeper into Nashville territory.\n\nBut once the Rebellion approached scoring range, the Shock''s defensive front reappeared.\n\nBaby was stopped for a 1-yard loss on second down and then held for no gain on third-and-8. Richmond settled for a field goal with **8:24 remaining in the third quarter**.\n\nThe score was 21–3.\n\nThat sequence was a concise explanation for why the game remained so one-sided despite Richmond occasionally moving the ball. Nashville did not need to eliminate every productive run. It needed to create enough negative plays to force Richmond into third-and-long situations before the field shortened.\n\nRichmond produced only three tackles for loss against Nashville.\n\nNashville produced nine.\n\nThat six-play difference behind the line of scrimmage repeatedly altered possessions.\n\nThe Shock added another field goal early in the fourth quarter after Koala again generated the drive''s biggest play. With Nashville facing second-and-9 from the Richmond 37 as the quarter began, Koala ripped off a **25-yard run** to the 12.\n\nRichmond prevented another touchdown, but the field goal with **12:04 remaining** extended the advantage to **24–3**.\n\nOnly then did Richmond finally put together the kind of sustained scoring drive it had been searching for all afternoon.\n\nBaby began to find more room. He converted third-and-3 with an 11-yard run, followed with a 19-yard burst, then added gains of 7 and 13 yards later in the possession.\n\nWith 5:35 remaining, Baby scored from **9 yards out**, cutting Nashville''s lead to 24–9.\n\nIt was Richmond''s best offensive sequence, and it pushed Baby over 100 rushing yards for the second consecutive week.\n\nIt was also far too late.\n\nNashville responded by keeping the ball on the ground, converting another third down through Koala and draining the clock before punting with just over a minute remaining.\n\nRichmond managed one final first down, but the outcome had been decided long before.\n\nThrough two games, Nashville has now scored **45 points while allowing only 15**. The Shock have rushed for **704 yards** across those two victories.\n\nRichmond, meanwhile, has scored exactly nine points in each of its first two games. The Rebellion have now lost divisional games to Tallahassee and Nashville by a combined score of **51–18**.\n\nThe season is still young, but the early trajectories could hardly be more different.\n\n## Defining Play\n\nIt is difficult to choose anything other than the first snap.\n\nNashville began the game at its own 25 with the score 0–0.\n\nKoala took the opening handoff and went **75 yards for a touchdown**.\n\nThere was no buildup. Richmond was immediately forced into the exact kind of game it could least afford after its Week 1 loss: chasing an explosive divisional opponent from behind.\n\nThe significance was larger than six points.\n\nRichmond had watched Tallahassee''s Blackie break a 67-yard touchdown on the Makos'' second offensive snap one week earlier. Koala''s 75-yard score showed almost immediately that the Rebellion''s explosive-run problem had followed them into Week 2.\n\nNashville never trailed and never allowed Richmond to get within two scores after that play.\n\n## Offensive Player of the Game\n\n**Koala, Nashville Shock**\n\nKoala followed a 264-yard Week 1 performance with **250 rushing yards and three touchdowns on 31 carries**.\n\nThat gives him **514 rushing yards through Nashville''s first two games**.\n\nAgainst Richmond, he averaged 8.1 yards per carry and produced the game''s defining 75-yard touchdown on his first attempt. He later broke runs of 22, 25, 15, 14, 11 and 10 yards while repeatedly converting critical downs.\n\nHis three touchdowns accounted for all of Nashville''s trips to the end zone.\n\nThe most impressive part may be that Nashville actually reduced his workload from 41 carries in Week 1 to 31 in Week 2 without sacrificing production. Mini, Leon Gory and the rest of the rotation provided enough support for Koala to remain explosive rather than simply absorbing volume.\n\nThrough two weeks, there may not be a more consistent offensive centerpiece in the league.\n\n## Defensive Player of the Game\n\n**Sloth, Nashville Shock**\n\nKoala provided the highlights. Sloth helped make sure Richmond never had the opportunity to match them.\n\nSloth finished with **12 tackles and five tackles for loss**, leading a Nashville defense that produced nine stops behind the line of scrimmage.\n\nHis impact was particularly important against Baby.\n\nRichmond''s featured runner entered Week 2 after rushing for 193 yards against Tallahassee. Nashville held him to **102 yards on 26 carries**, and much of that production came during the Rebellion''s late fourth-quarter touchdown drive.\n\nSloth repeatedly disrupted Richmond before its rushing concepts could develop. He made tackles for loss in the first and second quarters, continued creating penetration after halftime and remained involved deep into the fourth.\n\nRichmond''s problem was not that every play failed. It was that Nashville created enough losses to constantly interrupt otherwise promising possessions.\n\nNobody embodied that more than Sloth.\n\n## Summary\n\nNashville improved to **2–0 with a 24–9 divisional victory over Richmond**, powered by another enormous performance from Koala, who rushed for **250 yards and three touchdowns on 31 carries** after producing 264 yards in Week 1. The Shock finished with 350 rushing yards and nine tackles for loss, while Sloth dominated defensively with 12 tackles and five stops behind the line. Richmond received 102 yards and a late touchdown from Baby but fell to **0–2**, while Nashville strengthened its early claim as one of the league''s top teams.","2026-08-19T17:51:00Z",true],"source_row":9,"source_sheet":"Articles"}'),
('e8cfb0a6-b30c-5b14-90a4-19a2f67b6f28', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 10, '2026-w13-g65-recap', 'articles', '2026-w13-g65-recap', '{"cells":["2026-w13-g65-recap",1.0,13.0,65.0,"game_recap","published","Kiwi''s 200 Yards, Three Touchdowns Send Sacramento Past Milwaukee 36–21 and Into Playoffs","Kiwi rushes for 200 yards and three scores, while Micro and Streak connect for three touchdowns as Sacramento defeats Milwaukee 36–21, completes a three-game winning streak and clinches a top-six playoff berth at 7–6.","Sacramento entered the final week with its season on the line. It left with a playoff berth.\n\nKiwi rushed for **200 yards and three touchdowns**, Micro threw for **274 yards and three scores**, and the Gold Rush defeated the Milwaukee Forge **36–21** to finish the regular season at **7–6**, good for a place in the AFL''s six-team playoff field.\n\nThe result completed Sacramento''s second victory over Milwaukee in three weeks, following a **30–18 road win in Week 11**, and ended the Forge''s season at **5–7–1**.\n\nFor Sacramento, this wasn''t simply another division win. It was the culmination of a remarkable late-season recovery.\n\nThe Gold Rush entered at **6–6**, occupying fourth place by winning percentage in the league-wide standings, but only narrowly ahead of San Antonio (6–6), Richmond (6–7) and Milwaukee (5–6–1). With the top six advancing, Sacramento could remove all doubt by winning. Milwaukee, seventh entering the matchup, needed an upset to keep its hopes alive.\n\nSacramento made sure that didn''t happen.\n\n## Sacramento Starts on the Ground\n\nMilwaukee received the opening possession but punted after Woodstock''s third-down pass fell incomplete. Sacramento responded with a sustained march from its own 20, using Kiwi''s runs and completions to Moose and Streak to convert repeatedly.\n\nKiwi finished it from **7 yards out with 5:36 remaining in the first**, putting the Gold Rush ahead **6–0**.\n\nMilwaukee moved the ball late in the quarter, including a 25-yard rush by Dog, but settled for a field goal early in the second. The Forge had cut the deficit to **6–3**, yet Sacramento answered immediately.\n\nA 20-yard Kiwi run helped launch the drive, and Micro found Streak from **4 yards out** for a **12–3** advantage.\n\nMilwaukee''s passing game finally found rhythm. Woodstock hit NS Bear for 23 yards and eventually found McJagger for a **10-yard touchdown**, narrowing the margin to **12–9**.\n\nSacramento''s most important first-half response came in the closing seconds. Kiwi plunged in from **1 yard out with 12 seconds remaining**, sending the Gold Rush to halftime up **18–9**.\n\n## Milwaukee Threatens in the Third\n\nAn early third-quarter Woodstock pass intended for Dog was intercepted by Micro, but Sacramento couldn''t turn the takeaway into points. Milwaukee soon found its opening.\n\nTrunky broke loose for 25 yards and then exploded for a **38-yard touchdown** with 11:31 left in the third quarter. The Forge had pulled within **18–15**, just one possession from overturning the game.\n\nSacramento answered before Milwaukee could seize the momentum.\n\nMicro found Streak for a **17-yard touchdown with 5:18 remaining in the third**, restoring a nine-point advantage at **24–15**. It was the second touchdown connection between the pair, and it would not be their last.\n\n## Streak Breaks the Game Open\n\nThe fourth quarter began with Sacramento still facing a dangerous opponent. Micro opened a scoring drive with a **21-yard completion to Moose**, then struck Streak for a **20-yard touchdown with 10:26 remaining**.\n\nThe Gold Rush had stretched the lead to **30–15**.\n\nStreak finished with **nine catches for 116 yards and three touchdowns**, all from Micro. Moose was nearly as productive, catching **nine passes for 115 yards**, giving Sacramento two reliable receiving threats alongside its punishing ground game.\n\nMilwaukee refused to disappear. Woodstock connected with McJagger for 24 yards and NS Bear for 28, then found McJagger again for a **4-yard touchdown with 5:38 remaining**.\n\nAt **30–21**, the Forge still needed a stop and a rapid finish.\n\nThey never got the stop.\n\nSacramento moved the ball downfield, drained the clock and handed Kiwi the opportunity to finish what he had started. With **1:43 remaining**, he broke away for a **24-yard touchdown**, his third of the evening.\n\n**Sacramento 36, Milwaukee 21.** That was the final margin.\n\n## The Playoff Picture\n\nSacramento entered Game 65 fourth overall at **6–6**, behind Nashville (9–1–3), Portland (8–3–2) and Charlotte (8–5). San Antonio also stood at 6–6, followed by Richmond at 6–7 and Milwaukee at 5–6–1.\n\nWith only six playoff berths available, the Gold Rush needed to keep clear of a dangerous cluster around the cut line. The win moved them to **7–6**, keeping them fourth in the overall standings and guaranteeing a top-six finish.\n\nMilwaukee dropped to **5–7–1**, falling further below the cut line and out of playoff contention. The Forge had produced impressive wins over Charlotte and San Antonio and even tied Nashville earlier in the season, but Sacramento swept both head-to-head meetings when the postseason stakes were highest.\n\nSacramento''s path was hardly straightforward. The Gold Rush fell to **3–5** after a Week 8 loss to Tallahassee, stunned Portland **27–24** in Week 9, then suffered a **27–0 shutout against Richmond** in Week 10. At 4–6, the season was slipping away.\n\nThey responded with three straight wins: **30–18 over Milwaukee, 24–21 at Portland, and 36–21 over Milwaukee**.\n\nSacramento also finished with two wins against Portland, one of the league''s strongest clubs, demonstrating that its late surge was built on more than favorable opponents.\n\n## Defining Play\n\nMilwaukee had just cut Sacramento''s lead to **18–15** on Trunky''s 38-yard touchdown run early in the third quarter. The Forge finally had momentum, and the Gold Rush could no longer rely on the nine-point halftime cushion.\n\nMicro''s **17-yard touchdown pass to Streak with 5:18 left in the third** restored a **24–15** lead and stopped the comeback from taking hold. When the same pairing connected for 20 more yards and another touchdown in the fourth, Milwaukee''s task became even more daunting.\n\nThe third-quarter score was the key answer when Sacramento most needed one.\n\n## Offensive Player of the Game\n\n**Kiwi, Sacramento Gold Rush**\n\nKiwi carried **30 times for 200 yards and three touchdowns**, adding **three receptions for 36 yards** and finishing with **236 yards from scrimmage**.\n\nHis touchdowns came from 7, 1 and 24 yards, reflecting three different roles: establishing the tone, finishing a crucial late-half drive and putting the game away in the final two minutes.\n\nMicro''s **22-of-37 passing for 274 yards and three touchdowns** and Streak''s three touchdown receptions were outstanding, but Kiwi supplied the offensive foundation throughout the night.\n\n## Summary\n\nSacramento completed a three-game winning streak and secured a top-six playoff position with a **36–21 victory** over Milwaukee. Kiwi delivered **200 rushing yards and three touchdowns**, while Micro and Streak connected for three passing scores. Milwaukee rallied to within **18–15** in the third, but Sacramento responded with two consecutive Streak touchdowns and Kiwi''s late 24-yard knockout blow. The Gold Rush finish **7–6** and head to the postseason; the Forge finish **5–7–1** and head home.","2026-11-22T00:09:00Z",true],"source_row":10,"source_sheet":"Articles"}'),
('5db95f98-fffe-5b69-b6e9-022a226023cc', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 11, '2026-w13-g61-recap', 'articles', '2026-w13-g61-recap', '{"cells":["2026-w13-g61-recap",1.0,13.0,61.0,"game_recap","published","Nashville Survives Charlotte''s Furious Finish, 18–15, to Seal No. 1 Standing","Koala rushes for 116 yards, Barnsworth catches 126 yards and a score, and Nashville withstands Charlotte''s last-minute rally to finish 9–1–3, first in the AFL standings.","Nashville''s regular-season finale had all the tension of a playoff game. The Shock overcame a halftime deficit, made a crucial goal-line stand and survived Charlotte''s frantic final possession to win **18–15**, finishing **9–1–3** atop the ten-team AFL.\n\nThe Kingsmen entered **8–4 and second overall**, immediately behind Nashville''s **8–1–3**. Both were comfortably inside the top-six playoff field, but seeding and momentum mattered. Nashville had beaten Charlotte **24–12 in Week 5**, giving this divisional rematch plenty of context. The Shock completed the season sweep; Charlotte fell to **8–5** and ultimately third overall after Portland''s victory later in Week 13.\n\n## Nashville Settles for Threes\n\nCharlotte''s early passing attack looked promising when Tweety found Tigger for **23 yards**, but an attempted throw to Jimbo was intercepted by Mini. Nashville converted the opportunity into a field goal with **8:59 remaining in the first**.\n\nThe Kingsmen answered with a field goal of their own at **6:10**, tying it **3–3**. Nashville moved downfield again but stalled near the end zone, adding another kick with **56 seconds left in the quarter** for a **6–3 lead**.\n\nThe Shock had moved the ball but left points available. Charlotte made them pay in the second quarter. With **9:25 before halftime**, Tweety found Lil Slushie for an **8-yard touchdown**, putting the Kingsmen ahead **9–6**.\n\nLeon Gory connected with Barnsworth for **24 yards** late in the half, but Nashville did not convert the possession into points. Charlotte took its three-point lead to the locker room.\n\n## Koala and the Goal-Line Stand\n\nNashville returned to its running identity in the third. Koala finished a march with a **1-yard touchdown with 8:14 remaining**, restoring a **12–9** lead. He would finish with **116 yards and a touchdown on 32 carries**.\n\nThe fourth quarter supplied the game''s most consequential defensive moment. Charlotte drove to the Nashville 1 and faced **fourth-and-1** with the Shock still leading by three. Rather than kick to tie, the Kingsmen went for the touchdown.\n\nRat took the handoff and lost **three yards**. Charlotte''s best opportunity to seize control disappeared on a turnover on downs.\n\nThe Shock finally got separation with **3:36 remaining**, when Leon Gory found Barnsworth for a **7-yard touchdown** and an **18–9** lead. Barnsworth finished with **nine receptions for 126 yards and a score**; Leon Gory threw for **196 yards on 16-of-27 passing**.\n\n## One Final Charlotte Charge\n\nCharlotte refused to go quietly. Tweety hit Tigger on completions of **14 and 21 yards**, then Lil Slushie for **14 more**, before finding Jimbo on a **4-yard touchdown** with **1:59 left**. Nashville''s advantage was suddenly **18–15**.\n\nThe Kingsmen got one final possession after Nashville punted with **54 seconds remaining**. Tweety was sacked for seven yards, completed a 13-yard pass to Jimbo, then absorbed another six-yard sack. On **fourth-and-10 with 15 seconds showing**, he found Lil Slushie for **22 yards** to keep the season-ending threat alive. His final pass was incomplete with three seconds left in the play history.\n\nTweety finished **25-of-51 for 289 yards**, with two touchdown passes and an interception. Tigger led Charlotte with **nine catches for 126 yards**, and Jimbo added **seven catches, 77 yards and a touchdown**. The production was substantial, but the Kingsmen could not make enough of their chances count.\n\n## Playoff Implications\n\nNashville retains **first overall at 9–1–3**, a powerful position in the six-team postseason. Charlotte drops to **8–5**, ultimately third after Portland overtakes it by winning percentage. The Kingsmen still qualify, but head into the playoffs after back-to-back defeats.\n\nThe difference was situational execution. Nashville had only 18 points and allowed a late touchdown, yet its defenders forced damaging losses. Barnsworth registered **five tackles for loss** in the play log, and Ernie added three. The fourth-and-1 stop at the 1-yard line was the clearest illustration.\n\n## Defining Play\n\n**Charlotte''s fourth-and-1 attempt at the Nashville 1 early in the fourth quarter.** Trailing only **12–9**, the Kingsmen chose to go for the lead. Rat lost three yards, preserving Nashville''s advantage and setting up the Shock''s eventual game-separating touchdown.\n\n## Offensive Player of the Game\n\n**Barnsworth, Nashville Shock.** Nine catches for **126 yards and the decisive fourth-quarter touchdown** gave Leon Gory his most reliable target. Koala''s 116 rushing yards were vital, but Barnsworth''s late score supplied the margin Nashville needed.\n\n## Defensive Player of the Game\n\n**Barnsworth, Nashville Shock.** The play history credits him with **five tackles for loss**, repeatedly disrupting an aggressive Charlotte offense in critical situations.\n\n## Summary\n\nNashville defeats Charlotte **18–15**, overcoming a 9–6 halftime deficit and stopping a fourth-and-1 run at its own goal line. The Shock finish **9–1–3 and first overall**; the Kingsmen close **8–5 and third**, both advancing to the AFL''s six-team playoffs.","2026-11-22T00:15:00Z",true],"source_row":11,"source_sheet":"Articles"}'),
('8aed09da-4334-5e64-9027-382307e18d2a', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 12, '2026-w13-g62-recap', 'articles', '2026-w13-g62-recap', '{"cells":["2026-w13-g62-recap",1.0,13.0,62.0,"game_recap","published","Columbus Stuns Richmond 24–21 on Last-Second Kick, Upending Playoff Race","A field goal with five seconds left gives Columbus a 24–21 win over Richmond. PullFrog posts 136 receiving yards and two touchdowns; Richmond falls from fourth to sixth in the tight top-six playoff picture.","Richmond''s playoff race took a painful turn at home. The Rebellion had climbed into fourth place entering their Week 13 finale, but Columbus spent the closing seven minutes holding the ball and kicked a **game-winning field goal with five seconds remaining** to steal a **24–21** victory.\n\nThe Talons finish **5–8** while Richmond closes **6–7**, sliding into the sixth and final playoff position pending the unfinished Tallahassee–San Antonio matchup. The defeat was especially frustrating because Columbus had already beaten Richmond **21–18 in Week 9**. The Talons won both divisional meetings by three.\n\n## Columbus Lands the First Blow\n\nMarine Bear opened aggressively, including a **21-yard completion to NL Bear** on third down, but the Talons initially came up empty. Richmond then gambled on **fourth-and-6 near midfield**; John''s throw toward Brownie was incomplete, handing Columbus favorable field position.\n\nColumbus converted the opportunity into a field goal with **3:54 remaining in the first**, taking a **3–0 lead**.\n\nRichmond responded through the air. John hit Brownie for **30 yards** to set up a promising possession, then the Rebellion made their own fourth-down gamble count. At the Columbus 1, **Baby gained exactly one yard on fourth-and-1** for a touchdown with **13:16 left in the second**. Richmond led **6–3**.\n\nColumbus answered by feeding Black Dog, who finished a scoring drive from **six yards out** with **4:56 before halftime**. The Talons reclaimed the lead **9–6**, setting the tone for the half''s repeated momentum swings.\n\n## Lead Changes in the Third\n\nBaby returned to the end zone on a **4-yard run with 13:46 left in the third**, pushing Richmond ahead **12–9**. But Columbus was ready with an immediate response.\n\nMarine Bear found PullFrog for a key **22-yard gain** and then connected again for a **10-yard touchdown at 11:54**. Columbus led **15–12**.\n\nRichmond responded with a field goal at **5:44**, restoring a **15–15** tie. Every score seemed to demand an immediate answer, and neither defense could completely settle the game.\n\nEarly in the fourth, the Marine Bear–PullFrog partnership struck again. A **17-yard touchdown pass with 11:43 left** gave Columbus a **21–15 advantage**.\n\nJohn refused to let Richmond''s season end quietly. With **7:13 remaining**, he found Brownie for a **24-yard touchdown**, tying it **21–21**. John finished **20-of-34 for 271 passing yards**; Brownie caught **seven passes for 125 yards and a touchdown**.\n\nThen the Rebellion defense needed one stop.\n\n## The Talons Own the Final Seven Minutes\n\nColumbus took over with **7:08 left** and put the game in EMC''s hands. Facing **fourth-and-1 with 5:12 remaining**, the Talons kept their offense on the field. EMC gained two yards.\n\nThey faced **fourth-and-1 again with 3:13 left**. EMC gained the yard needed.\n\nThe conversions denied Richmond precious possessions. Marine Bear found NL Bear for **15 yards**, and EMC ran for **10 yards with 1:06 left**, then another **10 yards with 28 seconds remaining**. A late sack pushed the Talons backward, but they stayed within kicking range.\n\nWith **five seconds showing**, Columbus converted a field goal to make it **24–21**.\n\nRichmond had no time to respond.\n\n## What the Loss Means\n\nRichmond entered **6–6 and fourth overall** in a league where only **six of ten teams qualify**. The loss left it **6–7 and sixth** after the completed games, creating a nervous wait for the Tallahassee–San Antonio finale to establish the remaining ordering around the cutoff.\n\nColumbus moved from **4–8 to 5–8**, up to eighth but still outside the playoff field. The Talons'' late-season success against Richmond will linger as one of the strange stories of an otherwise disappointing year: they swept a playoff contender while winning only five times overall.\n\nMarine Bear finished **20-of-37 for 250 yards and two touchdown passes**. PullFrog was the primary mismatch with **11 catches for 136 yards and two touchdowns**. Ralph also supplied **11 catches for 127 yards**, giving the Talons a second consistently productive target.\n\nOn the ground, EMC gained **74 yards on 18 carries**, while Black Dog added **67 on 22 carries and a touchdown**.\n\nRichmond got **two rushing touchdowns from Baby**, who finished with **59 yards on 19 carries**, and **74 rushing yards on 18 carries from EMC''s opposite-side counterpart** was part of the story of Columbus controlling late downs. The Rebellion''s offensive production was enough to reach 21 points, but not enough to reclaim the ball in time.\n\n## Defining Play\n\n**Columbus'' second fourth-and-1 conversion, with 3:13 remaining in a 21–21 game.** EMC gained a yard to keep the ball away from Richmond, allowing the Talons to continue their field-goal drive and consume the remaining clock.\n\n## Offensive Player of the Game\n\n**PullFrog, Columbus Talons.** Eleven receptions for **136 yards and two touchdowns**, with both scores following Richmond attempts to seize momentum. The Rebellion repeatedly had the lead or an opportunity to take it, only for PullFrog to deliver.\n\n## Defensive Player of the Game\n\n**EMC, Columbus Talons.** The play log credits EMC with **three tackles for loss** in addition to his productive two-way workload. His consecutive late fourth-down conversions made the winning drive possible.\n\n## Summary\n\nColumbus sweeps Richmond''s season series with a **24–21 road victory**, decided by a field goal with five seconds remaining. Marine Bear passes for 250 yards, PullFrog catches 136 and two scores, and EMC powers the final drive. Richmond finishes **6–7**, anxiously holding the sixth playoff position as the Week 13 slate concludes.","2026-11-22T00:15:00Z",true],"source_row":12,"source_sheet":"Articles"}'),
('f816538b-d784-5927-858c-6b3748cbbffb', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 13, '2026-w13-g64-recap', 'articles', '2026-w13-g64-recap', '{"cells":["2026-w13-g64-recap",1.0,13.0,64.0,"game_recap","published","Ezekiel''s Three Scores Power Portland Past Albuquerque 30–12, Locking Up No. 2","Portland races to a 30–0 lead behind Ezekiel''s 191 rushing yards and three total touchdowns, beating Albuquerque 30–12. Portland finishes 8–3–2 in second; the Vortex close 1–9–3.","Portland made the final regular-season game look like a playoff tune-up for three quarters, building a **30–0 lead** before allowing two late Albuquerque touchdowns in a **30–12 Wildfire victory**.\n\nEzekiel rushed for **191 yards and two touchdowns**, caught another score, and helped Portland finish **8–3–2 and second overall** in the AFL''s six-team playoff picture. Albuquerque closed **1–9–3 and tenth**, ending a difficult season without a postseason berth.\n\nIt was also the emphatic answer Portland needed after the teams'' **33–33 tie in Week 10**. Albuquerque had shown it could keep pace with one of the league''s best; the rematch removed the doubt.\n\n## Three Carries, One Touchdown\n\nAlbuquerque''s first drive began with an **11-yard Ming run**, but RBI Bear absorbed back-to-back sacks and the Vortex punted.\n\nPortland took over on its own 28 and called Ezekiel''s number three straight times. He gained **23 yards**, then **10**, then raced **39 yards for a touchdown with 11:33 remaining**.\n\nThree carries. Seventy-two yards. Six points.\n\nAlbuquerque''s next possession also stalled, and Portland again leaned on the ground game. The Wildfire eventually switched to the air at the goal line: C Monster found **Ezekiel for a 4-yard touchdown with 2:07 remaining in the first**.\n\n**Portland 12, Albuquerque 0.**\n\nThe rematch already had a very different feel from the October tie.\n\n## Fourth-Down Power\n\nThe Wildfire continued attacking behind Ezekiel and Big Boy. Facing **fourth-and-1 during a second-quarter march**, Portland turned to Big Boy, who broke free for **21 yards** and a first down.\n\nA few snaps later, Ezekiel scored on a **6-yard fourth-and-3 run with 8:20 left in the half**. Portland''s lead ballooned to **18–0**.\n\nAlbuquerque had little response. RBI Bear''s offense struggled with sacks and unsuccessful third downs, and a fourth-down run by the quarterback gained only one yard when the Vortex needed eight.\n\nPortland capitalized on the defensive stop by grinding downfield. Ezekiel broke another **20-yard run**, setting up a field goal with **five seconds left in the half**.\n\n**Halftime: Portland 21, Albuquerque 0.**\n\nIn a contest against a Vortex team that had tied them just three weeks earlier, the Wildfire had established total control.\n\n## Portland Reaches Thirty Before Albuquerque Responds\n\nThe third quarter followed the same pattern. Portland added a field goal with **6:32 remaining**, pushing the lead to **24–0**.\n\nBig Boy then supplied another explosive rush, gaining **26 yards** to set up the goal line. On the first play of the fourth quarter, he scored from **one yard out**.\n\n**Portland 30, Albuquerque 0.**\n\nEzekiel and Big Boy combined for **296 rushing yards on 43 carries**, an overwhelming workload that forced Albuquerque''s defense to tackle almost continuously. Hippo added **42 yards on nine attempts**, making Portland''s rushing advantage broader than a single exceptional player.\n\nOnly with the game out of reach did Albuquerque begin to find the end zone.\n\nRBI Bear connected with Rolf for a **13-yard touchdown with 8:19 remaining**, cutting the deficit to **30–6**. Later, with **1:43 left**, RBI Bear scored himself on a **1-yard quarterback run**.\n\nThe comeback made the final score **30–12**, but the Vortex never seriously threatened the outcome after trailing by thirty.\n\nRBI Bear completed **19 of 44 attempts for 213 yards**. Skunkers had **eight receptions for 89 yards**; Rolf added **eight catches for 86 yards and a touchdown**.\n\n## A Familiar Identity for a Playoff Team\n\nPortland''s offense was unapologetically run-heavy. Ezekiel finished with **26 carries for 191 yards and two rushing touchdowns**, plus **two catches for 10 yards and a receiving touchdown**. That is **201 yards from scrimmage and three total scores**.\n\nBig Boy ran **17 times for 105 yards and a touchdown**. C Monster threw only **15 passes**, completing seven for **71 yards and a score**. Portland simply did not need more through the air.\n\nThe defense complemented that formula with aggressive backfield play. Frog was credited with **five tackles for loss**, and Wasabi added two. Albuquerque was forced to operate behind the chains repeatedly, explaining the three scoreless quarters more clearly than the late touchdowns did.\n\n## Playoff Implications\n\nPortland entered Week 13 **7–3–2 and second overall** behind Nashville. Charlotte''s loss earlier in the week opened breathing room, and Portland''s victory pushed the Wildfire to **8–3–2**, locking them into second by winning percentage among the completed results.\n\nThe Wildfire have a credible title-contending resume, including a win over Nashville. Yet their two late-season losses to Sacramento remain a warning about the volatility of postseason matchups. Against Albuquerque, Portland looked like the dominant running team that opened the year.\n\nThe Vortex finish **1–9–3**, their draw against Portland in Week 10 standing out as a missed chance to build something more substantial.\n\n## Defining Play\n\nWith Portland already leading **12–0**, Big Boy converted **fourth-and-1 for 21 yards** in the second quarter. The possession stayed alive, and Ezekiel later converted **fourth-and-3 from six yards out for a touchdown**, making it **18–0**.\n\nThe sequence proved Albuquerque could not count on favorable down and distance to get the Wildfire off the field.\n\n## Offensive Player of the Game\n\n**Ezekiel, Portland Wildfire.** He rushed for **191 yards and two touchdowns**, caught another touchdown and amassed **201 total yards from scrimmage**. His 39-yard touchdown on the first drive set the tone, and his three total scores made him the clearest difference-maker.\n\n## Defensive Player of the Game\n\n**Frog, Portland Wildfire.** Five tackles for loss in the play history, contributing to a defensive effort that kept Albuquerque scoreless until the fourth quarter.\n\n## Summary\n\nPortland defeats Albuquerque **30–12**, riding Ezekiel''s 191 rushing yards and three total touchdowns alongside Big Boy''s 105 rushing yards. The Wildfire finish **8–3–2 and second overall**, while the Vortex close **1–9–3 and tenth**.","2026-11-22T00:15:00Z",true],"source_row":13,"source_sheet":"Articles"}'),
('d7f64198-67a9-5687-9d8f-7293013a1c55', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 14, '2026-mvp-rankings', 'articles', '2026-mvp-rankings', '{"cells":["2026-mvp-rankings",1.0,13.0,null,"mvp_rankings","published","The AFL MVP Race: Eight Stars, One Award, and a Battle Between Greatness and Winning","A top-eight AFL MVP ballot led by Nashville''s Koala over Portland''s Ezekiel, weighing season production, team success, defensive contributions and defining MVP moments.","# The AFL MVP Race: Eight Stars, One Award, and a Battle Between Greatness and Winning\n\n*The regular season has produced historic individual performances, extraordinary two-way players, and a handful of stars who have almost single-handedly carried their teams into postseason contention. But who deserves to be called the league''s most valuable player?*\n\nWith the AFL regular season nearly complete, the MVP conversation has become a fascinating debate over what the award should actually recognize. Should it go to the player with the most overwhelming statistical production? The quarterback responsible for nearly every touchdown his team scores? Or the centerpiece of the league''s most successful franchise?\n\nThis year''s ballot considers three factors: **individual production, importance to team success, and performance in defining moments.** Winning matters, but it isn''t everything. Defensive contributions deserve serious recognition, particularly in a league where several players contribute on both sides of the football. With four Week 13 games completed and Tallahassee–San Antonio still awaiting a final result, here are the eight players who have made the strongest cases for the AFL''s most prestigious individual award.\n\n## 8. <img src=\"https://andrew-jacobson06.github.io/public-audio/wildfire.png\" alt=\"Portland Wildfire logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Frog — Portland Wildfire | K / Defensive Front\n\n**Season stats:** 68 tackles | 32 tackles for loss | 7 sacks | 1 safety forced | 518 defensive line matchup wins | 426 offensive line matchup wins\n\nThe MVP conversation usually begins with running backs and quarterbacks, but Frog has produced a season that demands recognition. Portland''s versatile, roster-listed kicker has been an absolute menace in the trenches, leading the league with **32 tackles for loss and seven sacks**. His 518 defensive line matchup victories are also the league''s highest total. This isn''t merely a defender accumulating tackles after opponents cross the line of scrimmage; Frog is consistently preventing them from getting there in the first place.\n\nWhat elevates his candidacy is his involvement on both sides of the ball. Frog has contributed 426 offensive line matchup victories while helping anchor a Portland team that finishes **8–3–2**, second in the overall standings. He ranks eighth because MVP-level disruption from a nontraditional position is difficult to measure against players who directly account for thousands of yards and multiple touchdowns each week. Still, a league-leading defensive season on one of the AFL''s best teams deserves a place on the ballot.\n\n**MVP Moment — Week 13 vs. Albuquerque:** With Portland looking to secure its postseason position, Frog registered **five tackles for loss** as the Wildfire built a 30–0 lead before cruising to a 30–12 victory. It was the perfect illustration of his season: consistently destroying possessions before they had an opportunity to develop.\n\n## 7. <img src=\"https://andrew-jacobson06.github.io/public-audio/outlaw.png\" alt=\"San Antonio Outlaws logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Luke — San Antonio Outlaws | RB\n\n**Season stats:** 288 carries | 1,526 rushing yards | 9 rushing TD | 49 receptions | 549 receiving yards | 2 receiving TD | 2,075 yards from scrimmage | 11 total TD\n\nLuke has been one of the league''s most complete offensive weapons from the opening week. His 1,526 rushing yards rank third in the AFL, but focusing exclusively on his rushing production undersells what he brings to San Antonio. His 549 receiving yards make him a legitimate threat regardless of how the Outlaws get him the football. Only three players have surpassed 2,000 yards from scrimmage, and Luke has accomplished it while averaging **5.3 yards per carry** and avoiding a single recorded fumble.\n\nThe challenge for Luke''s MVP case is the Outlaws'' record. San Antonio stands at **6–6 with its final game still unfinished**, leaving the team fighting for position around the playoff cutoff rather than competing for the league''s top seed. Luke has been remarkably consistent and indispensable, but his eleven touchdowns trail several other candidates, and his team''s uneven results make it difficult to push him into the upper tier. An explosive, multifaceted season earns him seventh.\n\n**MVP Moment — Week 1 vs. Sacramento:** Luke announced himself immediately with a **73-yard touchdown run** in San Antonio''s 27–15 opening victory over the Gold Rush. It was a statement about the game-breaking speed that would make him one of the AFL''s most productive all-purpose backs throughout the season.\n\n## 6. <img src=\"https://andrew-jacobson06.github.io/public-audio/rebel.png\" alt=\"Richmond Rebellion logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Baby — Richmond Rebellion | RB\n\n**Season stats:** 327 carries | 1,492 rushing yards | 15 rushing TD | 46 receptions | 422 receiving yards | 3 receiving TD | 1,914 yards from scrimmage | 18 total TD | 130 tackles | 9 TFL | 3 sacks | 2 forced fumbles\n\nThere may not be a more physically demanding individual season anywhere in the AFL than the one Baby has delivered for Richmond. His offensive numbers alone would merit consideration: nearly 1,500 rushing yards, more than 400 receiving yards and 18 touchdowns. But those figures tell only part of the story. Baby has also recorded **130 tackles, nine tackles for loss, three sacks and two forced fumbles**. He is simultaneously one of Richmond''s most important offensive weapons and one of its most active defenders.\n\nThat''s what makes Baby such an interesting MVP candidate. His production isn''t concentrated in one role, and his impact isn''t limited to the scoreboard. He has repeatedly kept Richmond competitive while absorbing an enormous workload. Unfortunately, the Rebellion''s **6–7 finish** creates a ceiling for his candidacy, particularly after a heartbreaking Week 13 loss to Columbus left their playoff position precarious. Had Richmond converted another one or two close games into victories, Baby could easily be approaching the top three. Instead, his exceptional two-way season lands sixth.\n\n**MVP Moment — Week 12 vs. Charlotte:** Facing one of the league''s strongest teams with Richmond''s postseason hopes on the line, Baby delivered **165 rushing yards, 45 receiving yards and two rushing touchdowns** in a 30–18 victory over the Kingsmen. His 210 yards from scrimmage helped Richmond secure one of its most consequential wins of the season.\n\n## 5. <img src=\"https://andrew-jacobson06.github.io/public-audio/wildfire.png\" alt=\"Portland Wildfire logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> C Monster — Portland Wildfire | QB\n\n**Season stats:** 136/236 passing | 1,667 passing yards | 14 passing TD | 63 rushing yards | 1 rushing TD | 62 tackles | 28 TFL | 5 sacks | 426 defensive line matchup wins | 263 offensive line matchup wins\n\nC Monster''s candidacy might be the hardest to evaluate in conventional football terms. As Portland''s quarterback, he has not produced passing statistics remotely comparable to the AFL''s most prolific quarterbacks. His 1,667 yards and 14 passing touchdowns are modest beside the numbers of Tweety or Micro. But evaluating him exclusively as a quarterback ignores a remarkable defensive season: **28 tackles for loss and five sacks**, alongside an enormous number of offensive and defensive line matchup wins.\n\nC Monster is effectively contributing to Portland''s success in multiple phases of the game. He directs an offense built around Ezekiel, makes enough throws to punish defenses that overcommit to stopping the run, and provides disruptive defensive production that most quarterbacks simply don''t offer. Portland''s second-place finish gives those contributions additional weight. His lower passing volume and two lost fumbles prevent him from joining the leading MVP candidates, but his overall impact on a championship contender is substantial enough for fifth.\n\n**MVP Moment — Week 8 vs. Nashville:** Against the eventual league leaders, C Monster delivered **216 passing yards and a 15-yard touchdown to Hippo** in Portland''s 21–15 victory. The Wildfire handed Nashville its only loss of the regular season, and C Monster''s performance helped prove Portland could beat an elite opponent with more than Ezekiel''s rushing alone.\n\n## 4. <img src=\"https://andrew-jacobson06.github.io/public-audio/kingsmen.png\" alt=\"Charlotte Kingsmen logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Tweety — Charlotte Kingsmen | QB\n\n**Season stats:** 255/429 passing | 3,055 passing yards | 25 passing TD | 111 carries | 575 rushing yards | 6 rushing TD | 3,630 combined passing and rushing yards | 31 total TD\n\nThere is a strong argument that Tweety has been the league''s most dangerous dual-threat quarterback. He leads all quarterbacks on winning teams in passing yardage, ranks near the top in touchdown production, and has generated another 575 yards on the ground. His **31 combined touchdowns** are particularly impressive considering how frequently Charlotte asks him to create something beyond the structure of the passing game. When the Kingsmen are at their best, Tweety can beat a defense with his arm, his legs or both on the same possession.\n\nCharlotte''s **8–5 record** is a major asset for his candidacy, but the timing of its losses matters. The Kingsmen entered Week 12 at 8–3 and positioned to challenge for one of the league''s highest playoff seeds. Consecutive losses to Richmond and Nashville have cooled both the team''s momentum and Tweety''s MVP case. He still ranks above the other quarterbacks outside the top three because his statistical production is outstanding and his team has consistently competed near the top of the standings. But his late-season stumble creates enough separation between him and the final three candidates.\n\n**MVP Moment — Week 9 vs. Tallahassee:** Tweety completed **30 of 42 passes for 320 yards and four touchdowns** in Charlotte''s 30–18 victory over the Makos. His 26-yard touchdown pass to Tigger in the fourth quarter helped put the game out of reach, showcasing the passing efficiency and explosiveness that drove Charlotte''s rise into the league''s upper tier.\n\n## 3. <img src=\"https://andrew-jacobson06.github.io/public-audio/rush.png\" alt=\"Sacramento Gold Rush logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Micro — Sacramento Gold Rush | QB\n\n**Season stats:** 220/393 passing | 2,689 passing yards | 24 passing TD | 113 carries | 509 rushing yards | 8 rushing TD | 3,198 combined passing and rushing yards | 32 total TD\n\nNo player has done more to change the direction of his team''s season over the final month than Micro. Sacramento was **3–5 after Week 8**, seemingly headed toward a disappointing finish. A stunning victory over Portland briefly revived hope, but a 27–0 shutout against Richmond left the Gold Rush at 4–6. What followed was one of the league''s most impressive late-season runs: three straight victories to finish **7–6**, clinching a top-six playoff berth. Micro was at the center of that recovery.\n\nHis 32 combined touchdowns trail only RBI Bear''s total among the quarterbacks in the season data, and his 509 rushing yards give Sacramento another dimension that defenses must account for. More importantly, his production has translated into wins against meaningful competition. Sacramento swept Portland during the regular season and defeated Milwaukee twice in the final three weeks. Micro''s candidacy is about more than the numbers; it''s about the difference between a team drifting toward elimination and one nobody should want to face in the playoffs. His only real weakness is that Sacramento''s 7–6 record doesn''t match the elite consistency of the two teams represented above him.\n\n**MVP Moment — Week 13 vs. Milwaukee:** With Sacramento''s playoff berth at stake, Micro completed **22 of 37 passes for 274 yards and three touchdowns**, all to Streak, in a 36–21 victory. Milwaukee had pulled within 18–15 in the third quarter, but Micro responded with a 17-yard touchdown to Streak and added another 20-yard scoring connection in the fourth. The performance capped Sacramento''s three-game winning streak and secured its postseason place.\n\n## 2. <img src=\"https://andrew-jacobson06.github.io/public-audio/wildfire.png\" alt=\"Portland Wildfire logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Ezekiel — Portland Wildfire | RB\n\n**Season stats:** 365 carries | 2,412 rushing yards | 18 rushing TD | 24 receptions | 271 receiving yards | 1 receiving TD | 2,683 yards from scrimmage | 19 total TD | 6.61 yards per carry | 0 fumbles\n\nIf the AFL MVP award were decided solely on individual dominance, Ezekiel would win it. His **2,412 rushing yards** are the highest total in the league by more than 300 yards, and his 6.61 yards per carry is extraordinary for a player who has handled 365 rushing attempts. He has produced 29 runs of at least 20 yards, including five runs of 50 or more, without fumbling once. He isn''t simply the most productive runner in the league; he is its most explosive offensive weapon, capable of turning a routine possession into six points on almost any snap.\n\nPortland''s **8–3–2 record and second-place finish** strengthen his case considerably. The Wildfire have built their offensive identity around Ezekiel, and he has justified that trust with one remarkable performance after another. The argument against him is surprisingly narrow: Nashville finished ahead of Portland, and Koala delivered more touchdowns and a larger volume of drive-sustaining rushing production. Ezekiel has the advantage in yardage, efficiency and explosiveness. Koala has the advantage in touchdowns and overall team success. It''s an exceptionally close decision, but Ezekiel finishes second on this ballot.\n\n**MVP Moment — Week 1 vs. Charlotte:** In the season opener, Ezekiel rushed for an astonishing **301 yards and three touchdowns on 33 carries**, including two separate **71-yard touchdown runs**, as Portland defeated Charlotte 18–12. It remains perhaps the single most breathtaking individual offensive performance of the AFL season. Two of his touchdowns came on nearly identical breakaway runs, and all three Portland touchdowns came from him. It was the kind of performance that established an MVP candidacy before most of the league had even completed its first game.\n\n## 1. <img src=\"https://andrew-jacobson06.github.io/public-audio/shock.png\" alt=\"Nashville Shock logo\" width=\"32\" height=\"32\" style=\"vertical-align:middle; object-fit:contain;\" /> Koala — Nashville Shock | RB\n\n**Season stats:** 403 carries | 2,093 rushing yards | 21 rushing TD | 18 receptions | 142 receiving yards | 2 receiving TD | 2,235 yards from scrimmage | 23 total TD | 134 rushing first downs | 41 broken tackles\n\nKoala may not lead the league in rushing yards, but he leads the league''s best team in the category that matters most: making an offense work. Nashville finishes **9–1–3**, first in the AFL, and Koala has been its offensive foundation from opening week through the regular-season finale. His 403 carries and 134 rushing first downs show how thoroughly the Shock have relied on him. He has scored **23 touchdowns**, more than any other non-quarterback on this ballot, and has consistently created positive gains when Nashville needed to extend possessions, preserve leads or finish drives. While Ezekiel can change a game in one play, Koala has repeatedly demonstrated the ability to control an entire game.\n\nThe most compelling argument for Koala is the relationship between his performance and Nashville''s extraordinary consistency. The Shock have lost only once in thirteen games, and that defeat came against Portland, the team led by his closest MVP competitor. Koala''s production has given Nashville an identity built around possession, efficiency and physical control. He isn''t as explosive as Ezekiel, and his 5.19 yards per carry are less eye-catching, but his combination of **2,235 yards from scrimmage, 23 touchdowns and first-place team success** represents the strongest overall MVP case. The award isn''t for the league''s best statistical season. It''s for its most valuable player. This year, that distinction belongs to Koala.\n\n**MVP Moment — Week 1 vs. Columbus:** Koala began the season with **264 rushing yards and a touchdown on 41 carries** in Nashville''s 21–6 victory. It wasn''t defined by one enormous run; his longest gained 26 yards. Instead, he produced 15 rushing first downs, repeatedly moved the chains and dictated the pace of the entire game. That performance established the blueprint Nashville would follow all season: give Koala the football, trust him to control the game, and force opponents to beat the Shock on Nashville''s terms.\n\n---\n\n## The Verdict: Dominance vs. Value\n\nThe 2026 AFL MVP race ultimately comes down to two extraordinary running backs who have dominated in very different ways. Ezekiel has delivered the most spectacular statistical season, accumulating 2,683 yards from scrimmage and producing explosive plays at a rate nobody else can match. If voters prioritize individual excellence above everything else, he is an entirely defensible choice. Micro''s late-season heroics, Tweety''s dual-threat production, and the remarkable two-way contributions of Baby and C Monster demonstrate just how strong and varied this year''s field has been.\n\nBut **Koala is my pick for AFL Most Valuable Player**. His 23 touchdowns, 134 rushing first downs and massive workload have been instrumental in Nashville finishing atop the standings with only one loss. The award should recognize the player whose contributions are most closely tied to sustained team success, and no candidate combines production, reliability and winning quite like Koala. Ezekiel may have produced the better highlight reel, but Koala has authored the most convincing MVP season.","2026-11-22T00:31:09.694Z",true],"source_row":14,"source_sheet":"Articles"}'),
('95e3318a-13b5-57aa-807e-c67b33eb6b21', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 15, '2026-playoffs-g66-recap', 'articles', '2026-playoffs-g66-recap', '{"cells":["2026-playoffs-g66-recap",1.0,"Divisionals",66.0,"game_recap","published","Nathan''s Two Touchdowns, San Antonio''s Late Stand End Sacramento''s Run, 21–18","San Antonio rallies from a 12–6 halftime deficit behind two Olaf-to-Nathan touchdowns, then runs out the clock after Sacramento cuts it to three. The Outlaws eliminate the Gold Rush 21–18 and advance to face Portland.","San Antonio had beaten Sacramento twice during the regular season, but the third meeting demanded a different kind of performance. The Outlaws trailed at halftime, lost a lead they had built in the first quarter, and faced a late Gold Rush comeback. They still found a way to make it three wins in three meetings.\n\nOlaf threw two second-half touchdowns to Nathan, Luke provided 135 yards from scrimmage, and San Antonio survived **21–18** in the opening round of the AFL playoffs. The Outlaws advance to visit Portland in the West Division Championship. Sacramento''s remarkable late-season revival ends one game after it earned a postseason berth.\n\nThe teams entered the playoffs with identical **7–6 regular-season records**, but their head-to-head history belonged to San Antonio: a 27–15 victory in Week 1 and a 27–24 win in Week 4. The Gold Rush arrived on a three-game winning streak, while the Outlaws were coming off a 15–12 win at Tallahassee in their regular-season finale. Something had to give.\n\n## Luke Starts the Scoring\n\nNeither club had the luxury of easing into the game. San Antonio opened the scoring with a methodical first-quarter possession, leaning on Luke before he finished the drive from **1 yard out with 6:49 remaining**. The touchdown made it **6–0**, and it looked briefly as though the Outlaws would dictate the game with their ground attack.\n\nBut Sacramento had a quarterback capable of changing the rhythm. Micro, who had produced 32 combined touchdowns during the regular season, began working the ball to Moose and Streak. San Antonio''s defense kept the Gold Rush off the board for the rest of the first quarter, but the passing game was gradually finding room.\n\nThat room became six points in the second. Micro connected with **Moose for a 4-yard touchdown at 8:20**, tying the game **6–6**. The Gold Rush then produced the most important offensive sequence of their half: another drive ending with Moose in the end zone, this time on a **7-yard touchdown pass from Micro with 22 seconds remaining**.\n\nSacramento went to halftime ahead **12–6**. The underdog had scored twice through the air, and San Antonio''s early advantage had disappeared.\n\n## Nathan Changes the Game\n\nSan Antonio needed to adjust. Sacramento was slowing the Outlaws'' rushing attack enough to make the game uncomfortable, and another scoreless quarter might have put the home team in serious danger.\n\nThe answer came from **Nathan**. On third-and-11 in the third quarter, Olaf found him for an **11-yard first down**. A few plays later, on second-and-8, the quarterback returned to the same target for a **27-yard touchdown with 8:21 remaining**.\n\nThe score tied the game **12–12**, but the drive''s importance was larger than six points. San Antonio had finally forced Sacramento to respect a passing threat beyond the rushing game.\n\nThe Gold Rush also missed an opportunity to increase their lead earlier in the quarter. Facing **fourth-and-1**, Sacramento ran Kiwi, who was stopped for a **2-yard loss**. The turnover on downs denied the visitors a continuation drive while protecting San Antonio''s comeback opportunity.\n\nThe score remained tied entering the fourth quarter. With the season on the line, the next successful possession could decide who would face Portland.\n\n## The Outlaws Seize Control\n\nSan Antonio broke the tie with a **field goal at 12:45 of the fourth**, reclaiming a **15–12** lead. But a field goal alone could not make the finish comfortable, especially against a Sacramento offense that had rallied repeatedly down the stretch.\n\nThe next decisive connection again came between Olaf and Nathan.\n\nWith **8:39 remaining**, Olaf found Nathan for an **8-yard touchdown**, extending San Antonio''s lead to **21–12**. Nathan finished the game with **seven catches for 103 yards and two touchdowns**, turning what had been a difficult evening into a winning one for the Outlaws.\n\nOlaf''s final line was **16 completions on 28 attempts for 183 yards and two touchdowns**. Those numbers won''t overwhelm a box score, but both scoring passes arrived when his team needed them most.\n\nSacramento answered with urgency. Micro kept the offense moving, and Streak continued to stretch the chains. The Gold Rush reached the goal line, where Kiwi scored from **2 yards out with 3:17 remaining** to cut the deficit to **21–18**.\n\nFor a moment, it looked as though Sacramento might get a final possession with the chance to tie or win.\n\nSan Antonio refused to surrender the ball.\n\n## One Last First Down\n\nLuke gained **3 yards**, then **7 more for a first down**, keeping the clock moving. Another seven-yard gain created a manageable situation, but after the next rush yielded only one yard, the Outlaws faced **third-and-2** with the game still hanging in the balance.\n\nInstead of giving Sacramento a chance to get the ball back, San Antonio handed it to **Bobo**. He broke through for **14 yards**, the first down that effectively ended the Gold Rush''s season. The Outlaws then kneeled out the clock.\n\n**Final: San Antonio 21, Sacramento 18.**\n\nLuke finished with **97 yards and a touchdown on 28 carries**, plus **four catches for 38 yards**. It was not a spectacular rushing night by his standards, but his late first down helped secure the result.\n\nSacramento''s Micro completed **23 of 38 passes for 216 yards and two touchdowns**, adding **22 rushing yards**. Moose caught **10 passes for 65 yards and both Sacramento passing touchdowns**, while Streak produced **10 catches for 133 yards**. Yet the Gold Rush''s running game was contained: Kiwi managed **35 yards on 14 carries**, despite scoring the late touchdown.\n\nSan Antonio''s defense did the hardest work. Fuzz was credited in the play history with **seven tackles for loss** and a sack, repeatedly forcing Sacramento to fight through long-yardage situations. That disruption gave the offense just enough opportunities to turn the game.\n\n## What It Means\n\nSan Antonio moves on to the **West Division Championship at Portland**, a matchup with a compelling recent history. The Outlaws lost **41–24** at Portland in Week 3 but won the rematch **24–15** at home in Week 11. One more victory would send them to the national championship.\n\nSacramento exits after a remarkable journey from **4–6** to **7–6** and the playoffs. The Gold Rush won three straight to qualify, including a decisive regular-season finale against Milwaukee. Their late surge was real; so was San Antonio''s ability to exploit their weaknesses when it mattered.\n\n## Defining Play\n\n**Bobo''s 14-yard run on third-and-2 late in the fourth quarter.** Sacramento had cut the lead to three and needed the ball back. Bobo''s conversion allowed San Antonio to kneel out the clock and ended the possibility of a fourth-quarter comeback.\n\n## Offensive Player of the Game\n\n**Nathan, San Antonio Outlaws.** Seven receptions, **103 yards and two touchdowns**. His 27-yard score tied the game in the third; his 8-yard score gave the Outlaws the decisive nine-point cushion in the fourth.\n\n## Defensive Player of the Game\n\n**Fuzz, San Antonio Outlaws.** With **seven tackles for loss and a sack** credited in the game history, Fuzz made Sacramento''s offense work for nearly every crucial yard. His impact was a major reason Kiwi never established the kind of rushing rhythm that powered the Gold Rush into the postseason.\n\n## Summary\n\nSan Antonio eliminated Sacramento **21–18** after overcoming a **12–6 halftime deficit**. Two touchdown catches by Nathan and a late Bobo first-down run secured the win. The Outlaws advance to meet Portland; Sacramento''s three-game winning streak and playoff run end.","2026-11-24T21:14:54.304Z",true],"source_row":15,"source_sheet":"Articles"}'),
('f832501f-5d33-5bd1-8289-56e10a247b16', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 16, '2026-playoffs-g67-recap', 'articles', '2026-playoffs-g67-recap', '{"cells":["2026-playoffs-g67-recap",1.0,"Divisionals",67.0,"game_recap","published","Baby''s Fourth-Quarter Takeover Stuns Charlotte as Richmond Advances, 21–18","Down 12–3 after three quarters, Richmond rallies behind Baby''s 186 yards from scrimmage and two rushing scores, including the winner with 1:58 left. The Rebellion upset Charlotte 21–18 and advance to Nashville.","For three quarters, Charlotte appeared to have survived the most dangerous part of its playoff opener. The Kingsmen led **12–3**, Richmond''s offense was sputtering, and the home crowd could see a trip to the East Division Championship coming into focus.\n\nThen **Baby** took over.\n\nRichmond''s two-way star rushed for **120 yards and two touchdowns**, added **66 receiving yards**, and helped drive a fourth-quarter comeback that produced an improbable **21–18 victory** over Charlotte. The Rebellion, the East''s lower-seeded survivor with a **6–7 regular-season record**, advance to face top-seeded Nashville. Charlotte, which finished **8–5**, is eliminated after surrendering 18 points in the final quarter.\n\nThis was the teams'' third meeting. Charlotte won **24–21 in Week 3**, but Richmond answered **30–18 in Week 12**. The rubber match carried the highest stakes of all.\n\n## Charlotte Controls the Early Game\n\nCharlotte struck first after its opening possessions established favorable field position. The Kingsmen settled for a **field goal with 10:08 left in the first quarter**, taking a **3–0** lead.\n\nRichmond struggled to sustain drives, with Charlotte forcing a series of punts and keeping John from finding rhythm. Early in the second quarter, the home team expanded its advantage when **Rat scored from 1 yard out with 12:20 remaining**.\n\n**Charlotte 9, Richmond 0.**\n\nThe Kingsmen were controlling both field position and the scoreboard. Their defense was making the Rebellion earn every first down, and Richmond''s normally productive offense had little room to operate.\n\nRichmond finally got on the board with a **field goal at 2:16 before halftime**, cutting the margin to **9–3**. It wasn''t the touchdown the visitors needed, but it prevented the half from ending in a shutout.\n\nThe third quarter brought another long stretch of resistance. Charlotte added a **field goal with 3:54 remaining**, stretching the lead to **12–3**.\n\nAfter 45 minutes, Richmond had produced only three points. The Rebellion needed something far more dramatic than an ordinary comeback.\n\n## A Fourth Quarter That Changed Everything\n\nThe first snap of the fourth quarter finally brought an offensive breakthrough. **John connected with Brownie for a 17-yard touchdown**, cutting the deficit to **12–9**.\n\nThe score changed the atmosphere. Richmond had gone from needing two possessions just to take the lead to trailing by one field goal. Charlotte''s previously comfortable advantage suddenly looked fragile.\n\nBaby then delivered the play that turned momentum completely. With **8:11 remaining**, he broke free for a **24-yard rushing touchdown** and gave Richmond its first lead of the game, **15–12**.\n\nFor the Kingsmen, the challenge was now psychological as much as tactical. They had controlled nearly the entire game but found themselves trailing with the season on the line.\n\nTweety responded like the quarterback who had powered Charlotte''s 8–5 regular season.\n\nHe completed a 10-yard pass to Rat, recovered from a sack, converted third downs with Jimbo and Rat, and eventually connected on consecutive throws of **13 and 14 yards to Babe TreeClimbers**. Deep in Richmond territory, he found Babe TreeClimbers again for a **4-yard touchdown with 4:15 remaining**.\n\nCharlotte retook the lead **18–15**.\n\nThe Kingsmen had answered Richmond''s surge. All they needed was one defensive stand.\n\nThey didn''t get it.\n\n## Baby Delivers the Final Answer\n\nRichmond began its final scoring drive with **4:10 left**. John found Baby for **8 yards** on second down, putting the visitors in manageable territory.\n\nThen Baby began breaking the game open on the ground.\n\nHe gained **24 yards on third-and-2**, moving Richmond across midfield. On the next play, he ran for **18 more**, another first down. John then hit Brownie for **19 yards**, carrying the ball to the Charlotte 6.\n\nWith **1:58 remaining**, Baby took the handoff and scored from **6 yards out**.\n\n**Richmond 21, Charlotte 18.**\n\nThat drive captured the dual nature of Baby''s value: he could catch when defenses expected a run, break runs when a conversion was essential, and finish a possession in the end zone.\n\nCharlotte still had a chance. Tweety moved the Kingsmen into Richmond territory, finding Rat for 14 yards and Jimbo for eight. Rat converted a third-and-2 run for a first down. But the offense stalled just past midfield.\n\nAfter an incomplete throw, a 6-yard completion and another incompletion, Charlotte faced **fourth-and-4 with 53 seconds remaining**. Tweety targeted Babe TreeClimbers. The pass failed, and the possession ended on downs.\n\nRichmond kneeled out the remaining time.\n\n**Final: Richmond 21, Charlotte 18.**\n\n## Baby''s Complete Performance\n\nBaby''s final offensive line was **19 carries for 120 yards and two touchdowns**, plus **six receptions for 66 yards**. That''s **186 yards from scrimmage** against one of the East''s top teams.\n\nBut his work did not stop there. The game history also credits him with **13 tackles, five tackles for loss and four sacks**. It was a remarkably complete postseason performance: Richmond''s leading runner, one of its key receiving options, its late-game scorer and its most disruptive defender.\n\nJohn completed **18 of 31 passes for 208 yards and a touchdown**. Brownie finished with **five receptions for 62 yards and the touchdown that opened the fourth-quarter comeback**.\n\nCharlotte''s Tweety threw for **263 yards on 31-of-53 passing** and a touchdown. Jimbo produced **11 catches for 81 yards**, while Rat contributed **29 rushing yards and a touchdown**, plus **nine catches for 66 yards**.\n\nCharlotte accumulated enough offense to threaten a win, but Richmond scored touchdowns while the Kingsmen had twice settled for field goals. In the end, that distinction mattered as much as the late heroics.\n\n## The Road Ahead\n\nRichmond now travels to Nashville, where the Shock await after finishing the regular season **9–1–3**. Nashville beat the Rebellion **24–9 in Week 2** and **27–18 in Week 11**, meaning the East Division Championship will be their third meeting.\n\nCharlotte''s defeat ends the Kingsmen''s season despite an **8–5** record and a strong statistical year from Tweety. Leading 12–3 through three quarters was not enough against a player capable of turning one period into a defining performance.\n\n## Defining Play\n\n**Baby''s 24-yard third-down run with 3:28 left in the fourth quarter.** Richmond trailed **18–15**, faced third-and-2, and needed to keep the ball. Baby broke free for 24 yards, followed with an 18-yard run, and set the table for his winning six-yard touchdown.\n\n## Offensive Player of the Game\n\n**Baby, Richmond Rebellion.** **120 rushing yards, 66 receiving yards and two touchdowns**, including the go-ahead score at 8:11 and the winner at 1:58. Richmond''s entire comeback flowed through him.\n\n## Defensive Player of the Game\n\n**Baby, Richmond Rebellion.** The play history credits him with **13 tackles, five tackles for loss and four sacks**. He was as influential disrupting Charlotte''s possessions as he was finishing Richmond''s own drives.\n\n## Summary\n\nRichmond rallied from a **12–3 deficit after three quarters** to eliminate Charlotte **21–18**. Baby delivered **186 yards from scrimmage, two rushing touchdowns and major defensive production**. The Rebellion advance to the East Division Championship at Nashville, while the Kingsmen''s season ends in heartbreak.","2026-11-24T21:14:54.304Z",true],"source_row":16,"source_sheet":"Articles"}'),
('d957ee77-3d9a-51b6-bebd-885f3f83a98e', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 17, '2026-playoffs-championship-preview', 'articles', '2026-playoffs-championship-preview', '{"cells":["2026-playoffs-championship-preview",1.0,"Divisional Championships",null,"playoff_preview","published","Four Teams, One Crown: Predicting the Division Championships and AFL National Championship","A full playoff forecast: Portland–San Antonio and Nashville–Richmond, the paths to victory for all four teams, x-factors and predicted scores, followed by a projected national title matchup and champion.","# Four Teams, One Crown: Predicting the Division Championships and AFL National Championship\n\nThe AFL postseason has already delivered a reminder that the regular-season standings are only the beginning of the argument. San Antonio needed a fourth-quarter stand to survive Sacramento **21–18**, while Richmond overturned a nine-point deficit entering the fourth against Charlotte and won **21–18** behind an extraordinary two-way performance from Baby. Those victories send the Outlaws and Rebellion into championship-week matchups with the two highest-ranked teams from the regular season.\n\nNow the stakes rise. Portland (**8–3–2**) hosts San Antonio (**7–6**) in the West Division Championship, and Nashville (**9–1–3**) hosts Richmond (**6–7**) in the East. The Wildfire and Shock earned their places with consistency across thirteen weeks; their challengers arrive hardened by elimination games. Both division championships are rematches of familiar opponents, and the projected national championship carries an especially intriguing possibility: a second meeting between the league''s two most dominant running backs.\n\n## West Division Championship: San Antonio Outlaws at Portland Wildfire\n\n**Regular-season series: tied 1–1. Portland won 41–24 in Week 3; San Antonio won 24–15 in Week 11.**\n\nThe West title game could hardly be framed more neatly. Portland has the league''s most explosive rushing attack, headlined by Ezekiel''s **2,412 regular-season rushing yards**, while San Antonio has one of the AFL''s most accomplished all-purpose backs in Luke, supported by the relentless two-way trench play of Fuzz. They have beaten one another by nine points or more, so neither needs to invent a blueprint for victory. The question is which version of these teams appears when everything is at stake.\n\nPortland''s early-season 41–24 victory suggested the Wildfire could simply overwhelm the Outlaws. San Antonio''s 24–15 revenge win in Week 11 told a different story: contain the ground game, force Portland into a more predictable passing script, and make the Wildfire play from behind. The Outlaws enter having just held Sacramento''s Kiwi to **35 rushing yards on 14 carries**, an encouraging sign before confronting an even more imposing runner.\n\n### How Portland Can Win\n\n**Make Ezekiel the center of the game without making him the only answer.** Portland is at its most dangerous when Ezekiel gets consistent early-down opportunities and Big Boy provides a second physical rushing threat. The Wildfire rushed for nearly 300 yards from that pair alone against Albuquerque in the regular-season finale. Forcing San Antonio''s front to defend both backs would create manageable third downs and give C Monster occasional chances to hit passes against defenses crowding the line.\n\nThe Wildfire also need to win field position through disruption. Frog recorded **32 regular-season tackles for loss and seven sacks**, while C Monster supplied significant defensive production alongside his quarterback duties. If that group can force Olaf and the Outlaws into third-and-long, Portland can prevent Luke''s ball-control running from setting the game''s tempo. The Wildfire must avoid the extended scoring drought that made their Week 11 loss to San Antonio possible.\n\n### How San Antonio Can Win\n\n**Repeat the defensive formula from Week 11 and finish with the ball in Luke''s hands.** Fuzz is the centerpiece of that plan. The Outlaws'' star lineman disrupted Sacramento throughout the first-round matchup, with seven tackles for loss credited in the play history. Against Portland, his assignments will be more demanding: the goal isn''t necessarily to shut Ezekiel down entirely, but to make enough negative plays to keep the Wildfire from running the same offense all afternoon.\n\nOffensively, San Antonio cannot depend on Luke alone. Nathan''s **two touchdown catches against Sacramento** changed that playoff game, and Olaf''s willingness to attack the intermediate field gave the Outlaws a way out of difficult situations. Luke can control the clock, but Nathan and the passing attack must convert those possessions into six-point drives rather than settle for field goals.\n\n### X-Factor: Ezekiel vs. Fuzz\n\nThis is the matchup that could decide the West. Ezekiel represents the league''s best combination of rushing volume and explosive-play efficiency. Fuzz represents one of its greatest sources of defensive penetration. If Ezekiel consistently reaches the second level, Portland can build the kind of advantage it did in Week 3. If Fuzz forces repeated losses and short gains, San Antonio can reproduce the conditions of its Week 11 victory.\n\nThere is also an underlying danger for Portland: the Outlaws have just proven they can keep a dangerous opponent under control in a close playoff game. The Wildfire have the higher ceiling, but San Antonio may be more comfortable in a one-possession finish.\n\n### Prediction: Portland 27, San Antonio 21\n\nThe pick is **Portland**, narrowly. Ezekiel and Big Boy should find enough rushing production at home to prevent San Antonio from completely dictating the pace, while Frog and Portland''s defense create one or two vital negative plays against Luke. Expect Fuzz to keep the Outlaws within striking distance, and expect Nathan to be heavily involved, but Portland''s ground attack ultimately produces one more touchdown than San Antonio can match.\n\n**Projected West champion: Portland Wildfire.**\n\n## East Division Championship: Richmond Rebellion at Nashville Shock\n\n**Regular-season series: Nashville leads 2–0. The Shock won 24–9 in Week 2 and 27–18 in Week 11.**\n\nNashville has been the standard of the East all season. Its **9–1–3 record** includes just one loss, and Koala has powered the offense with **2,093 regular-season rushing yards and 23 total touchdowns**. The Shock beat Richmond twice by a combined **24 points**, with their ability to control possessions proving too much for the Rebellion.\n\nBut the Richmond arriving in Nashville is not quite the same team those results describe. The Rebellion closed the regular season **6–7** and entered the playoffs as a lower seed, then stunned Charlotte with 18 fourth-quarter points. Baby accounted for **186 yards from scrimmage and two rushing touchdowns** in that victory, while also delivering a tremendous defensive performance. Richmond may be the less consistent team, but it is dangerous precisely because its star can change the game in several ways at once.\n\n### How Nashville Can Win\n\n**Control early downs, protect the football and make Richmond defend Koala for four quarters.** Nashville''s best offense doesn''t need a collection of long touchdowns. It needs Koala moving the chains, keeping the defense fresh and setting up scoring opportunities for Leon Gory and receivers such as Barnsworth. Koala recorded **134 rushing first downs** during the regular season, a measure of just how well the Shock can sustain possession.\n\nThe defense must also avoid giving Baby a clean path to the second level. Sloth and Ernie have been particularly disruptive near the line of scrimmage, and Nashville will need both to win their matchups. If Baby is met in the backfield often enough, Richmond will be forced to ask John to sustain long passing drives against a defense that has repeatedly protected narrow leads.\n\n### How Richmond Can Win\n\n**Turn this into an unpredictable, physical game rather than a Koala possession contest.** Richmond''s best chance is to alternate Baby''s rushing opportunities with John''s passing game, especially throws to Brownie and Ralph when Nashville crowds the line. Baby cannot be the entire offense; Charlotte saw what happened when Richmond finally found complementary passing answers, and the 17-yard John-to-Brownie touchdown at the opening of the fourth quarter was the spark that made the comeback possible.\n\nDefensively, the Rebellion need Baby''s versatility again, but cannot count on another superhuman performance as the entire strategy. The goal should be to force Nashville into field goals, create one extra possession, and keep the game close enough for Baby to decide in the final minutes. Richmond cannot afford to trail by multiple possessions with the clock running down against a Shock team built to consume it.\n\n### X-Factor: Baby vs. Nashville''s Interior Front\n\nBaby is both Richmond''s most important offensive option and one of its most disruptive defenders. He faces a difficult assignment against a Nashville offensive line that helps create Koala''s consistent rushing production, while Sloth, Ernie and the Shock front must also account for him when Richmond possesses the ball.\n\nIf Baby can win enough collisions on both sides, Richmond has a genuine upset path. If Nashville''s line absorbs his impact and Koala continues moving the chains, the Shock will make this feel like the regular-season meetings all over again.\n\n### Prediction: Nashville 24, Richmond 18\n\nRichmond has earned respect, and Baby is capable of keeping the game competitive into the fourth. Nevertheless, **Nashville''s balance and consistency** make it the pick. Koala should control enough early downs to keep John and Baby from receiving the possessions they need, while Barnsworth offers an answer when Richmond sells out against the run. The Rebellion will find the end zone, but the Shock''s superior ability to sustain drives should carry them through.\n\n**Projected East champion: Nashville Shock.**\n\n## Projected AFL National Championship: Nashville Shock vs. Portland Wildfire\n\nIf these predictions hold, the AFL''s championship game becomes the matchup the regular season has been building toward: **No. 1 Nashville against No. 2 Portland; Koala against Ezekiel**. The clubs met once in Week 8, when Portland handed Nashville its only regular-season defeat, **21–15**. Ezekiel rushed for **119 yards and two touchdowns**, while C Monster threw for **216 yards and a score**. Koala was held to **82 rushing yards and a touchdown**. Portland therefore owns the most valuable evidence in the matchup: it has already proven it can beat the Shock.\n\nYet this is not merely a rerun of Week 8. Nashville''s reliability over the full season is unmatched, and Koala''s ability to turn dozens of carries into an advantage remains the best foundation for a title run. Portland has the more explosive rushing threat and an aggressive defensive front. A national championship between them would be a referendum on two different forms of control: the ability to break a game open versus the ability to keep it exactly where you want it.\n\n### How Nashville Can Win\n\n**Win the possession battle and force Ezekiel to watch from the sideline.** Koala''s volume and first-down production can shorten the game, but Nashville will also need Leon Gory to make timely throws when Portland crowds the box. Barnsworth''s route-running and late-game scoring ability become essential if the Shock find themselves facing third downs near the red zone. Nashville should avoid gambling on a high-scoring track meet. Its best path is to make Portland earn every possession, then punish mistakes.\n\nDefensively, the Shock must prevent the 20-, 30- and 50-yard bursts that turn Ezekiel''s good games into historic ones. There may be no way to eliminate his production entirely; winning could require holding him to steady gains instead of game-breaking touchdowns.\n\n### How Portland Can Win\n\n**Attack before Nashville settles into its preferred pace.** Ezekiel needs to force the Shock to adjust early, while Big Boy gives Portland a second runner who can wear down the interior defense. C Monster must also keep the passing game credible; Nashville will have seen how heavily Portland depends on its ground attack and will likely commit extra defenders to stopping it.\n\nOn defense, Frog and C Monster need to create negative plays against Koala. The difference between second-and-5 and second-and-12 could determine whether Nashville sustains a possession or has to punt. Portland''s prior victory showed that it can withstand the Shock''s offense and still generate enough scoring chances to win.\n\n### X-Factor: Koala''s Consistency vs. Ezekiel''s Explosiveness\n\nBoth backs have been dominant, but in different ways. Koala finished the regular season with **2,093 rushing yards, 23 total touchdowns and 134 rushing first downs**. Ezekiel finished with **2,412 rushing yards, 19 total touchdowns and a league-leading 29 runs of 20 or more yards**.\n\nKoala can create six or seven successful plays in a row. Ezekiel can erase six or seven plays with one burst. The championship could come down to which skill proves more valuable with the game balanced in the fourth quarter.\n\n### National Championship Prediction: Nashville 24, Portland 21\n\nThe choice is **Nashville**, by a field goal. Portland has the blueprint to beat the Shock, and Ezekiel will almost certainly deliver at least one explosive moment. But a rematch gives Nashville a chance to tighten its defensive approach, while Koala''s ability to keep the offense on schedule should give the Shock an edge in a close finish. Expect Portland to remain dangerous until the final possession; expect Nashville to make just enough timely stops and conversions to claim the crown.\n\n**Projected AFL national champion: Nashville Shock.**\n\n## The Final Word\n\nThere is no safe route to an AFL title this year. San Antonio has already beaten Portland, Richmond has shown it can topple a favored opponent in the fourth quarter, and both top seeds have vulnerabilities that the challengers understand. That is what makes these division championships compelling: none of the four remaining teams needs to imagine how to win a big game. Each has done it.\n\nStill, over a season defined by Koala''s relentless production and Nashville''s refusal to lose, the Shock have built the strongest case to finish on top. The prediction is a Nashville–Portland championship decided in the closing minutes, with **Nashville lifting the trophy after a 24–21 victory**.","2026-11-24T21:14:54.304Z",true],"source_row":17,"source_sheet":"Articles"}'),
('ee58f27f-b832-5b2c-baa8-7cd85bf797ea', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 18, '2026-playoffs-g69-recap', 'articles', '2026-playoffs-g69-recap', '{"cells":["2026-playoffs-g69-recap",1.0,"Divisional Championships",69.0,"game_recap","published","From 15 Down to the Title Game: Nashville Rallies Past Richmond 24–18 for East Crown","Baby''s 62-yard touchdown helps Richmond surge ahead 15–0, but Leon Gory throws three touchdown passes and Koala rushes for 208 yards with the winner as Nashville survives 24–18 to reach the national championship.","Richmond had already shocked one favorite. For a quarter and a half in Nashville, the Rebellion looked ready to do it again.\n\nBaby tore through the Shock for a **62-yard touchdown** on Richmond''s opening drive, and by the opening minutes of the second quarter the visitors held a startling **15–0 lead**. Nashville''s season—the best regular-season campaign in the AFL at **9–1–3**—was in danger of ending without a trip to the championship game.\n\nInstead, the Shock staged the comeback that might define their year. Leon Gory threw **three unanswered touchdown passes**, Koala rushed for **208 yards** and the go-ahead score, and Nashville survived a desperate Richmond possession in the closing seconds to win **24–18** in the **East Division Championship**. The Shock advance to the AFL National Championship, where they will face the winner of Portland–San Antonio.\n\nIt was Nashville''s third victory over Richmond this season. The Shock won **24–9 in Week 2** and **27–18 in Week 11**, but neither game required anything approaching this kind of recovery. Richmond had entered the playoffs **6–7** and then stunned Charlotte 21–18. It nearly turned that breakthrough into a second consecutive upset before Nashville''s passing game, running attack and defense finally asserted themselves.\n\n## Baby Lands the First Punch\n\nRichmond opened the game at its own 25 and immediately demonstrated that its offense could move against Nashville. John found Junior for **12 yards on third-and-9**, converting a potentially drive-ending situation. On the next snap, Baby hit a crease and exploded for a **62-yard touchdown with 13:43 remaining in the first quarter**.\n\n**Richmond 6, Nashville 0.**\n\nThe message was unmistakable: the Rebellion weren''t coming to Nashville merely to survive. Baby had already supplied the explosive play that their upset bid needed.\n\nNashville began responding with Koala and a completion to Mini, but its opening attempts to establish rhythm failed to produce points. Richmond stayed aggressive, with Baby adding a **21-yard run** later in the first quarter to move the ball again.\n\nThe Rebellion extended their lead on a **field goal with 4:32 remaining**, making it **9–0**. As the quarter ended, Richmond was not only ahead; it was controlling field position and forcing the league''s top seed into the unfamiliar position of chasing the game.\n\nEarly in the second, Richmond moved inside the Nashville 10. Baby converted **third-and-2 with a 3-yard run**, then gained another three yards before plunging into the end zone from **3 yards out at 13:46**.\n\n**Richmond 15, Nashville 0.**\n\nTwo touchdowns from Baby. A fifteen-point advantage. The lower seed had exactly the start it needed.\n\n## Leon Gory Ignites the Comeback\n\nThe Shock finally responded with urgency.\n\nOn their next possession, Koala ripped off runs of **26 and 13 yards**, rapidly shifting the field. Nashville still faced a difficult **third-and-11**, but Leon Gory found Mini for **12 yards** to extend the drive. A few snaps later, he connected with **Barnsworth for a 10-yard touchdown with 10:08 remaining in the second quarter**.\n\nThe deficit was cut to **15–6**.\n\nThe significance was bigger than a single score. Richmond had bottled up the Shock on the scoreboard through the early stretch, but Nashville was finally combining Koala''s rushing with timely throws to stay ahead of the chains.\n\nThe Shock returned to the air late in the half. With **54 seconds remaining**, Leon Gory found **Mini on a 14-yard touchdown pass**, bringing Nashville within **15–12**.\n\nA game that looked dangerously close to getting away from the top seed was now a three-point contest at halftime.\n\nRichmond had controlled the opening stretch. Nashville had scored twice when it most needed to.\n\n## Three Touchdown Passes Turn the Game\n\nNashville received the second-half possession and refused to slow down.\n\nKoala gained eight yards on the opening play, then broke loose for **29 yards on third-and-2**. Leon Gory hit Mini for another first down, and Koala added runs of seven and nine yards to carry the Shock into scoring position.\n\nWith **13:21 left in the third quarter**, Leon Gory found **Oliver for a 12-yard touchdown**.\n\nFor the first time all game, Nashville led: **18–15**.\n\nThe sequence was a complete reversal of the first quarter. Nashville had scored **18 consecutive points**, with Leon Gory responsible for all three touchdowns through the air. The Shock had found an answer to Richmond''s willingness to crowd the ground game, while Koala''s runs continued forcing the defense to respect the line of scrimmage.\n\nRichmond was hardly finished, though. Baby remained dangerous—he would add a **20-yard gain** later in the quarter—and John connected with Brownie for **24 yards** as the Rebellion worked back into scoring position.\n\nThat drive eventually delivered a **field goal at 13:36 of the fourth**, bringing the game level at **18–18**.\n\nAfter surrendering eighteen unanswered points, Richmond had found a way to reset the contest. Fifteen minutes remained to determine the East''s representative in the championship game.\n\n## Koala Delivers the Winning Touchdown\n\nA tied game offered Nashville the simplest possible proposition: give the ball to its MVP-caliber running back and let him help create the winning possession.\n\nThe Shock moved into Richmond territory and faced **third-and-6** in the fourth quarter. Leon Gory found **Oliver for 15 yards**, keeping the drive alive. Koala added a five-yard run, and another completion to Oliver gained five more for a first down near the goal line.\n\nWith **6:09 remaining**, Koala took the handoff from the Richmond 2 and scored.\n\n**Nashville 24, Richmond 18.**\n\nKoala finished with **208 rushing yards on 33 carries**, plus **one reception for 11 yards**, totaling **219 yards from scrimmage**. His 2-yard touchdown was his only score of the evening, but it was the most important one. After Leon Gory''s passing game erased the early deficit, Koala supplied the final lead.\n\nLeon Gory finished **17-of-29 passing for 178 yards and three touchdowns**, with scores to Barnsworth, Mini and Oliver. Mini caught **seven passes for 77 yards**, Oliver added **six for 59**, and Barnsworth contributed **three catches for 31 yards**, including his touchdown.\n\nNashville had needed different players to answer different moments. Its quarterback rescued the game; its leading runner put it away.\n\nOr so it seemed.\n\n## Richmond''s Last Chance Reaches the Red Zone\n\nRichmond took over trailing by six with just over six minutes remaining. The Rebellion didn''t panic. Baby gained a fourth-and-1 conversion, John kept finding Brownie, and a steady series of modest advances carried the visitors across midfield.\n\nThe drive had the makings of another upset. With **2:22 remaining**, John found Brownie for **11 yards and a first down**, moving Richmond closer to a potential game-winning touchdown.\n\nThen Nashville''s defense began turning the situation against the Rebellion.\n\nJelly sacked John for a **4-yard loss with 1:49 remaining**. A short completion to Ralph moved the ball forward, but the clock continued to drain. Richmond converted another **fourth-and-2** when Baby gained three yards with 53 seconds left.\n\nThe Shock still couldn''t close the door completely. But Barnsworth delivered a devastating **9-yard sack with 41 seconds remaining**, forcing Richmond into second-and-19. John answered with an **18-yard completion to Brownie**, then found Baby for **11 more yards on third-and-1**.\n\nSuddenly, the Rebellion had reached the **Nashville 12** with ten seconds left.\n\nThey had two opportunities to steal the game.\n\nJohn''s first pass fell incomplete. His next throw, intended for Brownie with **five seconds remaining**, was also incomplete.\n\nThe comeback attempt ended there.\n\n**Final: Nashville Shock 24, Richmond Rebellion 18.**\n\nIt was a finish worthy of the stakes: Richmond began by stunning Nashville, Nashville counterpunched with three straight touchdown passes, and the outcome remained unresolved until the final snap.\n\n## Baby''s Heroics Fall Short\n\nRichmond''s season ends with an extraordinary performance from the player who had kept its postseason hopes alive the week before.\n\nBaby carried **25 times for 169 rushing yards and two touchdowns**, adding **five receptions for 43 yards**. His **212 yards from scrimmage** included the 62-yard touchdown that silenced Nashville early and the 3-yard score that pushed the Rebellion ahead 15–0. He also contributed defensively, registering seven tackles and a sack in the game history.\n\nJohn completed **24 of 46 passes for 234 yards**. Brownie was his most effective target, finishing with **12 receptions for 139 yards**, including key late catches that nearly carried Richmond to the end zone.\n\nThe Rebellion had enough production to win. What they couldn''t afford was the long stretch between their second touchdown and the fourth-quarter field goal. Nashville scored 18 unanswered points during that period, turning an apparently commanding Richmond lead into a deficit.\n\nThe loss should not erase Richmond''s improbable playoff run. After finishing **6–7**, the Rebellion eliminated an **8–5 Charlotte team** and pushed the league''s top seed to the final seconds on the road. Baby was the catalyst in both games, but the margins finally ran against them.\n\n## What It Means for Nashville\n\nNashville advances to the **AFL National Championship** and remains the team to beat. The Shock''s record and season-long consistency established them as favorites; this comeback demonstrated another quality that matters just as much in January-style football: the ability to survive when the preferred game plan collapses.\n\nA 15-point deficit against an energized underdog could have ended the season. Instead, Leon Gory adjusted through the air, Koala continued producing first downs, and Nashville''s front supplied enough pressure late to keep Richmond out of the end zone.\n\nTheir championship opponent will be the winner of the **West Division Championship between Portland and San Antonio**, which remains unplayed in the workbook at publication time. A Portland victory would set up a rematch of Nashville''s only regular-season loss, a **21–15 defeat in Week 8**. A San Antonio win would create a rematch of Nashville''s **12–6 victory in Week 7**.\n\nEither way, Nashville will arrive having already survived its most frightening deficit of the season.\n\n## Defining Play\n\n**Leon Gory''s 12-yard touchdown pass to Oliver with 13:21 left in the third quarter.** Nashville had trailed **15–0** early in the second, and this throw completed an **18-point unanswered comeback**. It was the moment the Shock transformed the game from an exercise in damage control into a championship-level response.\n\nKoala''s 2-yard touchdown later won it, but Gory''s third scoring strike was the play that fully reversed the contest.\n\n## Offensive Player of the Game\n\n**Leon Gory, Nashville Shock.**\n\n**17-of-29 passing, 178 yards, three touchdowns.**\n\nKoala''s **208 rushing yards** merit serious consideration, and his go-ahead touchdown ultimately decided the score. But with Nashville trailing **15–0**, it was Gory''s ability to find three different touchdown receivers—Barnsworth, Mini and Oliver—that rescued the offense. The Shock needed their quarterback to change the shape of the game, and he delivered.\n\n## Defensive Player of the Game\n\n**Barnsworth, Nashville Shock.**\n\n**Seven tackles, four tackles for loss and one sack**, according to the game history.\n\nBarnsworth contributed on offense, but his most valuable defensive moment came with **41 seconds remaining**, when he sacked John for a **9-yard loss**. Richmond kept fighting and reached the Nashville 12, yet the sack forced it to burn precious time and play through a far less forgiving down-and-distance situation.\n\nSloth also recorded **four tackles for loss and a sack**, while Jelly finished with **14 tackles and two sacks** in Nashville''s defensive effort.\n\n## Summary\n\nThe Nashville Shock are headed to the AFL National Championship after erasing a **15–0 deficit** and defeating Richmond **24–18**. Leon Gory threw three consecutive touchdown passes, Koala ran for **208 yards and the game-winning score**, and Nashville held firm after Richmond reached its 12-yard line in the final seconds. Baby''s **212 scrimmage yards and two touchdowns** nearly carried the Rebellion to another upset, but the Shock advance to face Portland or San Antonio for the league title.","2026-11-25T05:59:40.403Z",true],"source_row":18,"source_sheet":"Articles"}'),
('3eff57cd-6b8f-59c2-b143-b42df9295278', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 19, '2026-playoffs-g68-recap', 'articles', '2026-playoffs-g68-recap', '{"cells":["2026-playoffs-g68-recap",1.0,"Divisional Championships",68.0,"game_recap","published","Outlaws Shock Portland in Overtime, 12–9, to Reach AFL National Championship","San Antonio edges Portland 12–9 in overtime after a pivotal Ezekiel fumble, a goal-line fourth-down stand and Olaf''s 19-yard third-and-17 completion to Nathan setting up the winning kick. The Outlaws advance to face Nashville for the title.","<div style=\"background:#101a2d;color:#fff;border-radius:14px;padding:22px 18px;margin:0 0 24px;text-align:center;\">\n  <div style=\"font-size:12px;letter-spacing:2px;font-weight:700;opacity:.8;margin-bottom:16px;\">AFL · WEST DIVISION CHAMPIONSHIP · FINAL / OT</div>\n  <div style=\"display:flex;align-items:center;justify-content:center;gap:18px;\">\n    <div style=\"flex:1;min-width:0;\">\n      <img src=\"https://andrew-jacobson06.github.io/public-audio/wildfire.png\" alt=\"Portland Wildfire logo\" width=\"72\" height=\"72\" style=\"width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 8px;\" />\n      <div style=\"font-size:14px;font-weight:700;\">PORTLAND WILDFIRE</div>\n      <div style=\"font-size:38px;font-weight:800;line-height:1.2;\">9</div>\n    </div>\n    <div style=\"font-size:13px;font-weight:800;opacity:.7;\">FINAL<br/>OT</div>\n    <div style=\"flex:1;min-width:0;\">\n      <img src=\"https://andrew-jacobson06.github.io/public-audio/outlaw.png\" alt=\"San Antonio Outlaws logo\" width=\"72\" height=\"72\" style=\"width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 8px;\" />\n      <div style=\"font-size:14px;font-weight:700;\">SAN ANTONIO OUTLAWS</div>\n      <div style=\"font-size:38px;font-weight:800;line-height:1.2;\">12</div>\n    </div>\n  </div>\n  <div style=\"font-size:13px;font-weight:600;margin-top:14px;\">SAN ANTONIO ADVANCES TO THE AFL NATIONAL CHAMPIONSHIP</div>\n</div>\n\n# Outlaws Shock Portland in Overtime, 12–9, to Reach AFL National Championship\n\n**PORTLAND —** For much of the season, the Portland Wildfire could count on Ezekiel to turn a stubborn defense into a highlight reel. In the West Division Championship, the San Antonio Outlaws turned that advantage upside down. They held the league''s leading rusher under 100 yards, capitalized on Portland''s mistakes, and found the field goal that mattered most in overtime.\n\nSan Antonio defeated Portland **12–9 in overtime**, claiming the West championship and earning a trip to the AFL National Championship against Nashville. It was the Outlaws'' second consecutive playoff victory by a single possession, following a 21–18 win over Sacramento, and their second victory over Portland in the last two meetings. Portland, the **8–3–2** regular-season runner-up, exits despite earning the West''s top playoff position. San Antonio, which finished **7–6**, is one win away from a league title.\n\nThe teams had split their regular-season meetings: Portland won **41–24 in Week 3**, but San Antonio answered with a **24–15 victory in Week 11**. The championship rubber match looked nothing like the first encounter. Instead of a shootout between two talented backfields, it became a tense battle over field position, ball security and one extra yard.\n\n## A Fumble Opens the Door for Portland\n\nSan Antonio''s opening possessions showed that the Outlaws weren''t going to retreat from Portland''s defense. Olaf hit Luke for **18 yards** early, and later connected with him for **20 more** before Luke added a **19-yard rush**. The visitors were marching toward the Portland end of the field with the game still scoreless.\n\nThen the first major mistake arrived. Olaf completed a **13-yard pass to Bobo**, but Bobo lost the football. **Ezekiel recovered for Portland**, ending a promising San Antonio possession with **6:16 remaining in the first quarter**.\n\nPortland''s offense made that turnover hurt. C Monster connected with Wasabi and Hippo as the Wildfire moved downfield. Facing third-and-9 late in the quarter, C Monster found Hippo for **13 yards** to extend the drive. Then, with **41 seconds remaining**, he hit Hippo again, this time for a **14-yard touchdown**.\n\n**Portland 6, San Antonio 0.**\n\nThe Wildfire had taken the lead through the air rather than on one of Ezekiel''s trademark long runs. The score came directly after San Antonio surrendered possession, the kind of sequence that can decide a championship game when points are scarce.\n\n## Portland''s Own Turnover Changes the First Half\n\nEzekiel started the second quarter working to establish his usual rhythm, and the Wildfire kept one drive alive when Big Boy converted **fourth-and-1 with a 2-yard run**. Portland appeared to be building the kind of deliberate possession that had made it so dangerous all year.\n\nBut ball security, which had been a strength of Ezekiel''s regular season, suddenly became a problem.\n\nOn a first-down carry with **9:32 left in the second quarter**, Ezekiel put the ball on the ground. He recovered his own fumble, allowing Portland to continue. It was a warning, not yet a turnover.\n\nLess than three minutes later, the warning became costly. On **third-and-11 with 7:20 remaining**, Ezekiel gained four yards but **fumbled again**, and **Bobo recovered for San Antonio**. The Outlaws took possession, denying Portland the chance to extend its six-point lead.\n\nThat takeaway became the foundation of San Antonio''s first scoring drive. The Outlaws moved into field-goal range behind the short passing game and a patient rushing attack, and kicked a **field goal with 20 seconds remaining before halftime**.\n\n**Halftime: Portland 6, San Antonio 3.**\n\nBoth offenses had missed opportunities, and both had surrendered the football once. Portland''s defense had held up, but the offense had failed to create any separation. The game was exactly where San Antonio wanted it: close, physical and vulnerable to a single swing.\n\n## The Four Yards Portland Couldn''t Find\n\nThe third quarter provided the game''s defining test of Portland''s offensive identity.\n\nThe Wildfire opened the half with the ball and put together a lengthy drive, relying heavily on Ezekiel to move downfield. The possession reached the San Antonio 6-yard line, but the defense held a first attempt to a one-yard gain, then stopped Ezekiel for two more on third down.\n\nFacing **fourth-and-3 at the Outlaws'' 3 with 6:29 remaining**, Portland stayed with Ezekiel rather than taking a field goal. He gained **two yards**.\n\nThe Outlaws took over on downs at their own 1.\n\nIt was a devastating missed opportunity in a game where touchdowns were rare. Portland had crossed nearly the entire field but came away empty. San Antonio had avoided surrendering points while preserving the possibility of taking the lead with one touchdown of its own.\n\nThe teams remained locked at **6–3** through the end of the third quarter. Portland''s rushing success had been reduced to grinding gains, not explosive scores, and the Outlaws'' interior defense was winning the moments that mattered.\n\n## Bobo Breaks Through in the Fourth\n\nSan Antonio continued to lean into the defensive struggle, asking Olaf to make manageable throws while Luke and Bobo fought for yards. The Outlaws advanced deep into Portland territory and reached the 3-yard line early in the fourth quarter.\n\nThree straight Bobo runs finished the job. He gained one yard on first down, another on second, then powered into the end zone from **one yard out with 7:26 remaining**.\n\nFor the first time all game, San Antonio led.\n\n**Outlaws 9, Wildfire 6.**\n\nThe score was almost the opposite of what many expected when Portland entered as the West''s top seed. The Wildfire were chasing points against a defense that had contained their biggest weapon, and San Antonio was playing with the composure of a team that had already survived one playoff thriller.\n\nPortland still had time for one answer. C Monster repeatedly looked to Hippo, who became the Wildfire''s most productive receiver. The drive eventually reached the San Antonio 20, but the passing game stalled with consecutive incompletions on second and third down.\n\nWith **50 seconds remaining**, Portland kicked a field goal to tie it **9–9**.\n\nNeither team found a winner in the closing seconds of regulation. The West championship was going to overtime.\n\n## Overtime Belongs to the Outlaws\n\nSan Antonio took the first possession in the extra period and immediately found itself needing to convert. Luke managed just three yards on his first two carries, leaving **third-and-7**. Olaf found **Nathan for seven yards**, keeping the drive alive.\n\nLuke followed with an **11-yard run** and then four more, but a two-yard loss and an incomplete pass forced the Outlaws to punt.\n\nPortland had its opportunity to win. The Wildfire took over deep in their own territory and got a **13-yard completion from C Monster to Hippo** for a first down. But Ezekiel was stopped for a two-yard loss, then held to consecutive runs of no gain. On third-and-10, C Monster''s pass intended for Hippo fell incomplete.\n\nThe Wildfire punted.\n\nSan Antonio took possession and started building one last drive. Bobo converted **third-and-2 with a 10-yard run**, giving the Outlaws a first down and preserving their chance. The next play lost seven yards, and an incomplete pass to Nathan created **third-and-17**.\n\nThen Olaf made the game''s decisive throw.\n\nHe found **Nathan for 19 yards**, moving San Antonio to the Portland 33 and into position to attempt the winning kick.\n\nWith **4:38 showing in overtime**, the Outlaws sent out the field-goal unit. The kick was good.\n\n**Final: San Antonio 12, Portland 9 (OT).**\n\nSan Antonio had survived two overtime possessions, a dangerous Portland attack and a difficult third-and-17 to claim the West.\n\n## The Players Who Changed the Outcome\n\nOlaf completed **24 of 33 passes for 197 yards**, without a passing touchdown. His biggest contribution came when San Antonio needed a first down rather than six points. Nathan caught **11 passes for 82 yards**, including the seven-yard overtime conversion and the **19-yard third-and-17 completion** that set up the winner.\n\nBobo''s stat line went far beyond his **42 rushing yards and one touchdown on 15 carries**. He added **three catches for 38 yards**, recovered the key second-quarter Ezekiel fumble, and converted a crucial third down in overtime. He also contributed 22 tackles defensively, making him one of the game''s defining two-way performers.\n\nFor Portland, Ezekiel finished with **94 rushing yards on 28 carries** and **four catches for 26 yards**. He had entered with a league-leading **2,412 regular-season rushing yards**, but San Antonio prevented the big gains that had made the Wildfire so difficult to defend. His recovered first-half fumble was a scare; the later fumble recovered by Bobo was a genuine turnover and a major momentum shift.\n\nC Monster completed **17 of 28 passes for 155 yards and a touchdown**, finding Hippo **11 times for 116 yards and a touchdown**. The quarterback and receiver did enough to keep Portland alive through regulation, but a final field-goal attempt was all the Wildfire could produce after their opening-quarter score.\n\nThe Outlaws also got important defensive work from Gregg, who registered three tackles for loss. Portland''s Leo contributed two sacks, and Frog made disruptive tackles of his own, but the West title was ultimately decided by San Antonio''s ability to stop Portland where it hurt most—on short-yardage runs and in the red zone.\n\n## Where the Game Was Won and Lost\n\n**Ball security and fourth-down execution were the difference.** San Antonio committed a first-quarter turnover when Bobo''s fumble was recovered by Ezekiel, but Portland answered with an especially damaging turnover of its own when Bobo recovered Ezekiel''s second-quarter fumble. The Wildfire also lost a golden opportunity on fourth-and-3 from the San Antonio 3 in the third quarter.\n\nThose two lost opportunities forced Portland to survive on just one touchdown and one field goal through regulation. Even when the Wildfire tied the game late, their offense failed to produce another sustained drive in overtime.\n\nSan Antonio''s decisive possessions looked different: Bobo converted the third-down run that extended the final overtime drive, and Olaf delivered on third-and-17 when failure likely would have meant another punt. The Outlaws were not explosive, but they were better at making the next essential play.\n\n## What It Means for the Championship\n\nSan Antonio advances to meet **Nashville Shock**, which won the East Division Championship **24–18 over Richmond** after climbing out of a 15–0 hole. The national championship will pit Nashville''s league-best **9–1–3 regular-season record** against an Outlaws team that finished **7–6** but has now eliminated both Sacramento and Portland.\n\nThe teams met once during the regular season. Nashville won **12–6 in Week 7**. Given how this West final unfolded, another low-scoring battle would surprise no one.\n\nPortland exits with plenty of reasons to wonder what might have been. The Wildfire had beaten Nashville during the regular season and possessed the league''s most explosive rushing attack, but those strengths could not overcome an unusually costly day against San Antonio.\n\n## Defining Play\n\n**Olaf to Nathan for 19 yards on third-and-17 in overtime.** After a seven-yard loss left San Antonio facing a long-yardage situation near midfield, Olaf delivered his most important pass of the season. It moved the Outlaws into field-goal range and set up the kick that sent them to the national championship.\n\nPortland''s fourth-down failure at the San Antonio 3 in the third quarter was the other defining moment: the chance to put points on the board that the Wildfire never got back.\n\n## Offensive Player of the Game\n\n**Nathan, San Antonio Outlaws**\n\n**11 receptions, 82 yards.**\n\nIn a game that offered few explosive offensive plays, Nathan was the difference between stalled drives and survival. He converted third-and-7 early in overtime, then delivered the 19-yard third-and-17 reception that set up the championship-winning field goal.\n\n## Defensive Player of the Game\n\n**Bobo, San Antonio Outlaws**\n\n**22 tackles, one tackle for loss, one sack, and a recovered fumble**, alongside the winning team''s only touchdown on offense.\n\nBobo''s recovery of Ezekiel''s second-quarter fumble denied Portland a scoring chance, and his continued defensive workload helped limit the Wildfire to nine points. His contributions on both sides of the ball made him arguably the most consequential player in the West final.\n\n## Summary\n\nSan Antonio defeated Portland **12–9 in overtime** to win the West Division Championship. The Outlaws recovered an Ezekiel fumble, stopped him on fourth-and-3 at their own 3, and took a fourth-quarter lead on Bobo''s touchdown. Portland tied the game with 50 seconds remaining, but Olaf''s 19-yard strike to Nathan on third-and-17 set up the winning overtime field goal. San Antonio advances to face Nashville for the AFL title.","2026-11-25T18:24:07.359Z",true],"source_row":19,"source_sheet":"Articles"}'),
('96d2bd79-2dca-5a89-ae71-beb8e549bc8f', '1c52c07d-8ad5-532c-bd7c-90da3e492930', 'Articles', 20, '2026-playoffs-g70-championship-recap', 'articles', '2026-playoffs-g70-championship-recap', '{"cells":["2026-playoffs-g70-championship-recap",1.0,"National Championship",70.0,"game_recap","published","Koala''s Four Touchdowns Deliver Nashville''s First AFL Championship in 30–18 Victory Over San Antonio","Koala scores four touchdowns and rushes for 156 yards as Nashville overcomes a 12–9 halftime deficit, outlasts San Antonio 30–18 and wins the AFL championship. Three 11-play second-half touchdown drives decide the title.","# Koala''s Four Touchdowns Deliver Nashville''s First AFL Championship in 30–18 Victory Over San Antonio\n\n<div style=\"background:#101a2d;color:#fff;border-radius:14px;padding:22px 18px;margin:18px 0 24px;text-align:center;\">\n  <div style=\"font-size:12px;letter-spacing:2px;font-weight:700;opacity:.8;margin-bottom:16px;\">AFL NATIONAL CHAMPIONSHIP · FINAL</div>\n  <div style=\"display:flex;align-items:center;justify-content:center;gap:18px;\">\n    <div style=\"flex:1;min-width:0;\">\n      <img src=\"https://andrew-jacobson06.github.io/public-audio/outlaw.png\" alt=\"San Antonio Outlaws logo\" width=\"72\" height=\"72\" style=\"object-fit:contain;display:block;margin:0 auto 8px;\" />\n      <div style=\"font-size:14px;font-weight:700;\">SAN ANTONIO OUTLAWS</div>\n      <div style=\"font-size:38px;font-weight:800;\">18</div>\n    </div>\n    <div style=\"font-size:13px;font-weight:800;opacity:.7;\">FINAL</div>\n    <div style=\"flex:1;min-width:0;\">\n      <img src=\"https://andrew-jacobson06.github.io/public-audio/shock.png\" alt=\"Nashville Shock logo\" width=\"72\" height=\"72\" style=\"object-fit:contain;display:block;margin:0 auto 8px;\" />\n      <div style=\"font-size:14px;font-weight:700;\">NASHVILLE SHOCK</div>\n      <div style=\"font-size:38px;font-weight:800;\">30</div>\n    </div>\n  </div>\n  <div style=\"font-size:13px;font-weight:700;margin-top:14px;\">NASHVILLE SHOCK — AFL NATIONAL CHAMPIONS</div>\n</div>\n\n**SAN ANTONIO —** Nashville spent most of the regular season proving it could win close games. In the AFL National Championship, the Shock proved they could take one over.\n\nKoala rushed for **156 yards and four touchdowns**, Leon Gory recovered from an uneven first half to direct three decisive second-half scoring drives, and Nashville defeated the San Antonio Outlaws **30–18** to claim the AFL championship. The Shock, who finished the regular season 9–1–3, trailed 12–9 at halftime before overwhelming San Antonio with 15 unanswered points.\n\nFor the Outlaws, the defeat was a painful ending to an improbable run. San Antonio had survived Sacramento and upset Portland in overtime to reach the championship. Behind three touchdowns from Bobo, the Outlaws gave Nashville everything it could handle for two quarters. But the same offense that produced long, effective drives in the first half struggled to stay on the field after halftime, leaving Koala and the Shock with too many opportunities.\n\n## San Antonio Sets the Early Pace\n\nNashville received the opening possession but went three-and-out. Koala gained just five yards on his first two carries, and Leon Gory''s third-down pass to Oliver fell incomplete.\n\nSan Antonio''s response was almost the opposite: a **12-play, 70-yard touchdown drive** that consumed nearly six and a half minutes.\n\nLuke helped establish the ground game, while Olaf found SEMC and Nathan for important completions. The Outlaws converted third-and-2 with a nine-yard Bobo run and later kept the possession alive when Olaf connected with Nathan for 13 yards on third-and-8.\n\nBobo eventually finished the drive with a **9-yard touchdown run at 7:04**, putting San Antonio ahead 6–0.\n\nNashville had barely touched the football, and the Outlaws had already shown how they intended to win: control possession, stay patient and force the Shock to defend a long field.\n\nThat strategy worked for exactly one drive.\n\nNashville answered in just **four plays, covering 75 yards**. Leon Gory found Barnsworth for 25 yards, Koala picked up 10, and a 22-yard completion to Mini moved the Shock into scoring territory.\n\nKoala finished the possession with an **18-yard touchdown run at 4:55**, tying the game 6–6.\n\nThe contrast was striking. San Antonio had needed twelve plays to score; Nashville answered with four. Although the Shock''s opening possession had been ineffective, their second demonstrated how quickly they could erase an advantage.\n\n## A First-Half Fight for Control\n\nNeither offense found an immediate rhythm after the opening touchdowns.\n\nSan Antonio''s next possession stalled after Olaf took a five-yard sack, and Nashville followed with another three-and-out. The first quarter ended tied, but the Outlaws made an aggressive decision early in the second that would give Nashville its first lead.\n\nFacing **fourth-and-3 near their own 41**, San Antonio kept the offense on the field. Olaf dropped back and was brought down for a four-yard loss.\n\nNashville took over in favorable territory and moved inside the San Antonio 10. But the Outlaws'' defense stiffened, limiting Koala to short gains and forcing an incomplete third-down pass.\n\nThe Shock settled for a field goal with **11:35 remaining in the second quarter**, taking a 9–6 lead.\n\nSan Antonio''s offense then sputtered through consecutive possessions. A three-and-out was followed by a punt after Luke and the short passing game failed to produce enough yardage.\n\nThe Outlaws finally regained their footing midway through the quarter, beginning at their own 17.\n\nLuke broke free for **34 yards**, his biggest run of the evening, and added another 13-yard rush on third-and-3. The offense leaned into the same deliberate approach that had worked on its opening possession.\n\nBobo converted a third-and-1, gained six yards on the next play, and then found the end zone on an **11-yard touchdown run with 3:08 remaining**.\n\nThe **10-play, 83-yard drive** restored San Antonio''s lead, 12–9.\n\nNashville managed just one first down on its next possession, and although San Antonio moved the ball briefly in the final minute, neither team scored again.\n\n**Halftime: San Antonio 12, Nashville 9.**\n\nThe Outlaws had executed their plan for much of the first half. Luke was finding productive rushing lanes, Bobo had scored twice, and San Antonio had limited Nashville to a single touchdown.\n\nBut something important was developing beneath the score: Nashville was beginning to find consistent gains through Barnsworth, while Koala had already shown he could punish the Outlaws when given room. San Antonio needed its offense to maintain possession after halftime.\n\nIt couldn''t.\n\n## Nashville Takes Over the Third Quarter\n\nSan Antonio received the second-half kickoff with a chance to stretch its advantage. Instead, Bobo was stopped for no gain, Olaf completed an eight-yard pass to Nathan, and another Bobo run lost two yards.\n\nThe Outlaws punted after just four plays.\n\nNashville took possession and began the drive that changed the championship.\n\nLeon Gory found Barnsworth for **13 yards on third-and-5**, then went back to him for another 15-yard completion. Koala took over from there, gaining **11 yards on consecutive runs** to move deep into San Antonio territory.\n\nEven a sack couldn''t stop the possession. After Gory was dropped for a two-yard loss, Koala gained 11 yards on second-and-12 and then punched in a **7-yard touchdown on third-and-1 with 8:14 remaining**.\n\nThe **11-play, 71-yard march** put Nashville ahead 15–12.\n\nThe Shock had stopped relying on quick strikes. Instead, they were combining Barnsworth''s third-down production with Koala''s physical running to sustain long possessions.\n\nSan Antonio needed an answer, but the Outlaws'' next drive produced only one net yard before another punt.\n\nNashville went straight back to work.\n\nStarting at its own 34, Leon Gory found Barnsworth for **12 yards on third-and-9**. Later, he connected with the same receiver for another first down and then a **23-yard gain**, moving the Shock into scoring position.\n\nKoala carried for 10 yards, absorbed another setback when Gory took a seven-yard sack, and responded with a 12-yard rush to the San Antonio 2.\n\nWith **1:10 left in the third**, Koala scored again.\n\n**Nashville 21, San Antonio 12.**\n\nIt was another **11-play touchdown drive**, this one covering 66 yards.\n\nOver its two meaningful third-quarter possessions, Nashville had run **22 offensive plays for 137 yards and two touchdowns**. San Antonio, meanwhile, had managed two punts.\n\nThe difference wasn''t one explosive run. It was Nashville''s ability to keep converting and San Antonio''s inability to get off the field.\n\n## The Outlaws'' Fourth-Down Gamble Backfires\n\nTrailing by nine entering the fourth quarter, San Antonio needed urgency. The Outlaws opened the period with the ball but soon faced fourth-and-7 near their own 40.\n\nOlaf attempted a pass to Nathan. It fell incomplete.\n\nThe turnover on downs handed Nashville another short field.\n\nThe Shock couldn''t find the end zone this time. Koala was stopped for a loss on first down, Leon Gory missed a pass on second, and a nine-yard completion to Barnsworth left Nashville short of the marker.\n\nStill, the field position proved valuable. Nashville kicked a field goal with **11:26 remaining**, stretching its lead to **24–12**.\n\nSan Antonio had now surrendered points following two failed fourth-down attempts, and a championship that had been tied or separated by one possession for most of the afternoon was slipping away.\n\n## Bobo Gives San Antonio One Last Chance\n\nThe Outlaws weren''t finished.\n\nOlaf scrambled for 10 yards early in the next possession and found SEMC for a 14-yard completion. Luke added a nine-yard run, and Bobo converted a third-and-1 to keep the drive moving.\n\nA 13-yard pass to Nathan moved San Antonio inside the Nashville 20. Then Bobo broke loose for **18 yards**, bringing the offense to the 2-yard line.\n\nHe scored on the following snap.\n\nWith **7:20 remaining**, San Antonio had completed a **10-play, 75-yard touchdown drive** and narrowed the deficit to **24–18**.\n\nBobo''s third touchdown gave the Outlaws a path back into the game. Their defense needed one stop, and Olaf would have a chance to tie or win.\n\nBut Nashville refused to give him that chance.\n\n## Koala Closes the Championship\n\nNashville began its next possession at its own 25 with 7:13 remaining.\n\nA nine-yard completion to Barnsworth created third-and-1, and Koala converted it. He then gained 11 yards on first down, moving the ball toward midfield.\n\nSan Antonio managed to force third-and-8, but Leon Gory found Barnsworth for **12 yards**, another crucial conversion that kept the clock running.\n\nKoala gained one yard on second-and-2, then broke off a **12-yard run on third-and-1**, moving Nashville inside the red zone.\n\nWith **1:37 remaining**, Koala took the next handoff and burst through for a **19-yard touchdown**.\n\n**Nashville 30, San Antonio 18.**\n\nThe score was Koala''s fourth touchdown of the game, but the drive itself was just as important. Nashville had traveled **75 yards in 11 plays**, consuming more than five and a half minutes while San Antonio desperately needed possession.\n\nThe Shock didn''t merely add insurance points. They effectively ended the game by taking away the Outlaws'' remaining time.\n\nSan Antonio moved the ball into Nashville territory on its final possession, but a sack and consecutive incompletions created fourth-and-16 near midfield. Olaf''s final pass to Nathan fell incomplete with 37 seconds remaining.\n\nLeon Gory took a knee.\n\nNashville was champion.\n\n## The Stars Behind the Championship\n\n### Koala — Championship MVP\n\n**30 carries | 156 rushing yards | 4 rushing touchdowns | 1 catch | 3 receiving yards**\n\nKoala''s performance was a complete illustration of why he had been the AFL''s leading MVP candidate throughout the regular season.\n\nHe wasn''t dominant from the opening snap. Nashville''s first drive stalled after two modest carries, and San Antonio''s defense contained him during portions of the second quarter.\n\nBut as the game developed, his impact grew. His first touchdown tied the game, his next two scores turned a halftime deficit into a nine-point lead, and his 19-yard fourth-quarter touchdown sealed the championship.\n\nKoala''s best work came when the Outlaws knew he was getting the ball and still couldn''t stop him.\n\n### Leon Gory — The Steady Hand\n\n**17-of-31 passing | 205 yards**\n\nLeon Gory didn''t throw a touchdown pass, but Nashville would not have won without his timely completions.\n\nAfter a shaky opening possession, he steadily found Barnsworth and Mini to move the chains. In the third quarter, his consecutive completions to Barnsworth were central to both touchdown drives.\n\nHis final contribution was perhaps the most important: a third-and-8 completion to Barnsworth during Nashville''s championship-clinching possession.\n\nGory didn''t need to carry the offense. He needed to keep it moving until Koala could finish.\n\n### Bobo — San Antonio''s Answer\n\n**13 carries | 72 rushing yards | 3 touchdowns**\n\nBobo was exceptional for San Antonio. All three Outlaws touchdowns came from him, including the fourth-quarter score that brought the game back within six points.\n\nHis running provided the finishing touch to San Antonio''s two long first-half scoring drives, and he repeatedly converted manageable third downs.\n\nLuke added **102 rushing yards on 22 carries**, including the 34-yard second-quarter burst that helped San Antonio retake the lead. The running backs gave the Outlaws enough production to compete, but Nashville''s second-half possession advantage left them with too few opportunities.\n\n### Barnsworth — The Difference on Third Down\n\n**9 receptions | 126 receiving yards | 11 tackles | 6 tackles for loss**\n\nBarnsworth was the most consequential receiver in the championship. His 126 yards accounted for more than half of Nashville''s passing production, and several of his catches came on third down during the drives that broke the game open.\n\nHis defensive contribution was equally significant. Six tackles for loss repeatedly disrupted San Antonio''s ability to sustain offense, particularly after halftime.\n\nIf Koala was the player who finished the drives, Barnsworth was the player who made sure they continued.\n\n## Where the Championship Was Won\n\nSan Antonio did not lose because of interceptions or fumbles. Neither team committed a recorded lost fumble or interception.\n\nThe Outlaws'' damaging mistakes came on **fourth down**.\n\nTheir first failed conversion, early in the second quarter, handed Nashville a short field and led to a field goal. Their second, early in the fourth, gave the Shock another possession in favorable territory, producing three more points. The final failed attempt ended San Antonio''s last chance.\n\nMore importantly, Nashville controlled the second half through sustained possessions.\n\nThe Shock''s three second-half touchdown drives covered **71, 66 and 75 yards**, each requiring **11 plays**. San Antonio couldn''t consistently force punts, while its own early third-quarter possessions went nowhere.\n\nAt halftime, the Outlaws were leading 12–9. By the time Bobo scored to make it 24–18 in the fourth, Nashville had established complete control over the game.\n\nSan Antonio had one final opportunity to reverse that momentum.\n\nKoala and Barnsworth made sure it never materialized.\n\n## A Season Belonging to Nashville\n\nThe Shock entered the season as one of the AFL''s strongest teams and finished with the league''s best regular-season record at **9–1–3**. Their only defeat came against Portland, a team San Antonio eliminated in the West Division Championship.\n\nAlong the way, Nashville survived close games, relied heavily on Koala''s extraordinary rushing production, and demonstrated an ability to win in different ways.\n\nIn the East Division Championship, the Shock rallied from a 15–0 deficit against Richmond, scoring 24 unanswered points before surviving a late comeback attempt.\n\nIn the National Championship, they faced another halftime deficit. This time, there was no dramatic series of passing touchdowns. Instead, Nashville gradually overwhelmed San Antonio with efficient third-down conversions, long possessions and four touchdowns from its leading runner.\n\nThe Outlaws deserve credit for a remarkable postseason. After finishing the regular season 7–6, they eliminated Sacramento, stunned Portland in overtime and led the championship at halftime.\n\nBut Nashville was the stronger team over four quarters.\n\nThe Shock didn''t need a last-second stop or a miraculous comeback. They needed their best players to control the game when the title was on the line.\n\nKoala delivered four touchdowns. Barnsworth kept the chains moving. Leon Gory managed the offense when it mattered most.\n\nAnd Nashville finished the season exactly where it spent most of the year: **on top of the AFL.**","2026-11-25T19:44:21.015Z",true],"source_row":20,"source_sheet":"Articles"}') ON CONFLICT(id) DO NOTHING;
DROP TRIGGER afl_remaining_22_check;
DROP TABLE afl_remaining_22_guard;
DROP TABLE afl_remaining_22_0;
RELEASE SAVEPOINT afl_remaining_22;
PRAGMA foreign_key_check;
SELECT 'articles' AS imported_table,count(*) AS reviewed_records_present FROM articles t WHERE EXISTS(SELECT 1 FROM source_record_mappings m WHERE m.import_batch_id='1c52c07d-8ad5-532c-bd7c-90da3e492930' AND m.target_table='articles' AND m.target_id=CAST(t.id AS TEXT));
