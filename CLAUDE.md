# Batting Coach (cricket video analysis for coaches)

@AGENTS.md

## Goal
Give aspiring cricketers elite-style video analysis. **v1 = coach side only**: coaches manage a roster, upload batting clips, get pose-based scores + written feedback, and track each student over time. Athlete side (own uploads, Strava-style feed) comes later; the schema already has `athletes.user_id` and `profiles.role` for it.

## v1 scope
Cricket, batting only. Coach features: auth, roster, upload (tagged to student/date/shot type), automated analysis, per-video breakdown, student trends, roster overview (top improvers / unreviewed / declining), notes, score overrides.
Out of scope: athlete side, payments, native apps, live streaming, social, other sports/skills.

## Stack
Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase (auth, Postgres with row-level security, private Storage) · MediaPipe Pose Landmarker in the browser (keypoints) · plain TS metric code · OpenAI only to phrase feedback from computed numbers (never sees video, never invents metrics).

## Conventions
- Next 16 differences: `proxy.ts` (not middleware), async `params`/`cookies()`. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Colours/radius are tokens in `app/globals.css`; UI primitives in `components/ui/`. Restyle there.
- Every table is protected by RLS; coach can only see rows for their own athletes. Videos live in the private `videos` bucket at `<coach_id>/<athlete_id>/<video_id>.<ext>`, accessed via signed URLs only.
- Sport/skill metrics are config in `sports/<sport>/<skill>.ts`: `sports/cricket/batting.ts` (9 metrics + maths), `sports/cricket/shots.ts` (shot types + what good looks like per shot), `sports/types.ts` (shared shapes).
- Scoring is heuristic and NOT ground truth; needs calibration by a real cricket coach.

## Run it
1. `npm install`
2. Create a free Supabase project; run `supabase/schema.sql` in its SQL Editor.
3. `cp .env.example .env.local` and fill in the keys.
4. `npm run dev` → http://localhost:3000

## How analysis works
1. Browser (`lib/pose/extract.ts`): plays the clip slowly, runs MediaPipe Pose (CPU mode on purpose; GPU mode returns nothing for non-square video) on ~15 frames/s at 1024px, follows one person across frames. Only keypoints leave the device.
2. Server (`app/api/analyze/route.ts`): validates keypoints, runs `analyzeBatting` (never trusts browser scores), asks the LLM to phrase feedback from the numbers (`lib/analysis/feedback.ts`, falls back to a template), saves to `analyses`, stores keypoints JSON in the private bucket.
3. Metrics: distances are in torso-lengths; +x flipped to point at the bowler; body parts outside the frame are treated as not seen and the metric is left out, with a warning.

## Calibration (IMPORTANT)
All thresholds are unvalidated heuristics. To calibrate: have a real cricket coach score ~30 clips per shot type 0-100 per metric, compare to app scores, then edit ideal ranges in `shots.ts`/`batting.ts` and weights in `BATTING_METRICS`. Not yet tested on proper side-on footage.

## Dev-only test page
`/lab` (and `/api/dev/feedback`) run the pose pipeline on `public/dev-sample.webm` without login; disabled in production.

## Status
- [x] a. Setup + auth
- [x] b. Student roster
- [x] c. Video upload
- [~] d. Analysis pipeline built; metric accuracy unvalidated on good footage
- [ ] e. Per-video results (basic view exists) · f. Student dashboard · g. Overview, notes, demo data
