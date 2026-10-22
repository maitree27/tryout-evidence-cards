# Proof of work

What was built and how it was checked, against the three MVP tests. Everything below was run on a local copy of the app unless it says otherwise.

## Test 1: upload to evidence

- Uploaded a roster and a clip, picked a player, got an evidence card in about 6-7 seconds (AI call plus frame extraction).
- The card shows timestamped observations (for example 0:04, 0:07, 0:11), a confidence percentage for each, a thumbnail of the exact frame, and "Can't tell" for criteria without enough evidence.
- Tested with two real kids' football clips (Wikimedia Commons, CC BY-SA 4.0), two personal phone clips, and one night football clip.

## Test 2: compare and share

- Analysed two players from two different clips. The comparison table uses the same five criteria for both.
- The player whose clip was too distant and blurry was flagged "unclear footage", with "Can't tell" and "insufficient evidence" in every cell.
- Created a selector link and opened it in a separate tab. It showed the same table and cards.

## Test 3: bad input

| Case | Result |
|---|---|
| Roster with wrong columns, duplicate name, missing number, empty file, or `.txt` | Clear error, nothing loaded (`samples/`) |
| No player picked, no description, or consent unticked | Analyze button disabled, with a list of what is missing. The server also refuses. |
| Clip longer than 60 seconds | Error before anything is sent |
| Footage that is not soccer (relay race, workout) | Every criterion "Can't tell", nothing invented |
| Player not found in the clip | Red notice, nothing attributed to them |
| Generated dark clip | Warning, flagged as insufficient evidence |
| Generated blurry clip | Warning, flagged as insufficient evidence |
| Generated shaky clip | Caught after the shake check was rewritten (the first version missed it) |
| Generated normal clip | No false warning |

## Problems found and fixed while testing

- The AI gave a "Developing" soccer rating to a relay race. Fixed with an explicit rule, and re-tested.
- A "Can't tell" cell could still show "8 observations". Now observations are hidden when footage is unusable.
- The first shake check compared brightness and missed a shaky clip. Replaced with a check on how the picture slides between frames.

## Known limits (not hidden)

- Only 8 moments are sampled per clip, so a great pass between frames is invisible. Every card says so.
- The AI can follow the wrong person. The "Spotted as" line and the frame thumbnails are there so a coach can check.
- Confidence numbers are the AI's own estimate, not a measured accuracy. Ratings vary a little between runs.
- The dark and blur checks were verified on generated clips, not on a real dark phone clip.
- The Vercel deployment was not yet tested end to end when this was written.

## History

See [docs/PROOF_OF_PROGRESS.md](docs/PROOF_OF_PROGRESS.md) for a screenshot walkthrough of the app, and `git log` for the order things were built and fixed.
