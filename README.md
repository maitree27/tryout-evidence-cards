# Tryout Evidence Cards

A small web app for youth soccer coaches running tryouts. Upload a roster CSV and a short phone clip, pick the player, and get an AI-assisted evidence card with timestamped observations, confidence values and a "Can't tell" option. Process two or more players to get a comparison table and a one-page link to share with selectors.

## What it does

1. Upload a roster CSV (columns: `name`, `number`).
2. Upload a clip of 60 seconds or less. The browser pulls 8 timestamped frames from it and checks for dark, blurry or shaky footage.
3. Pick the player, describe how to spot them (for example "red bib, left wing") and tick the consent box.
4. The AI describes only that player in each frame and rates five criteria: first touch, ball control, passing, movement off the ball, defensive effort.
5. Plain code then checks the AI's answer. It deletes observations with timestamps that were never sent and forces "Can't tell" when evidence is thin.
6. Compare players in one table and create a shareable selector link.

No videos? Press **Use demo clip 1 / 2** on the page.

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev
```

Open http://localhost:3000.

`.env.local` holds `OPENROUTER_API_KEY` (an OpenRouter key; the app calls a Gemini model through it). It is ignored by git and must never be committed.

## Deploy

Deploys to Vercel. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` as environment variables, and add a Vercel Blob store so share links work.

## Where things are

- `app/page.tsx`: the main screen
- `app/api/analyze/route.ts`: the only place the AI is called, and what it is asked
- `lib/validateEvidence.ts`: the safety net that checks the AI's answer
- `lib/extractFrames.ts`: frame extraction and the dark/blur/shake checks
- `lib/parseRoster.ts`: roster CSV validation
- `samples/`: good and bad sample rosters

## Out of scope

Automatic bib or face matching, coach tap ratings, full consent management (a manual checkbox only), accounts, payments, live streams, team-camera integrations.

## Credits

Demo clips: "Children's association football 01 and 02" from Wikimedia Commons, CC BY-SA 4.0.
