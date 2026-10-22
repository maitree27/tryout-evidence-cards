# Willow (working title in code: Batting Coach) - cricket video analysis for coaches

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

## Verified
- Privacy: a second coach account saw none of the first coach's students, and pasted student/video links showed 'not found' (manual test, Oct 2026). Not yet tested: leaking via direct storage/API calls with a stolen link, minors-specific consent flows.

## Decisions
- Athlete side (later): INVITE-ONLY. A coach invites a student; the athlete's login attaches to the existing `athletes` row via `athletes.user_id`. No independent self-sign-up. Build order: roles + RLS (+ test) -> coach invite flow -> athlete upload/analysis/feedback -> feed/streaks/personal bests -> guardian consent step for under-18s.
- Product name: **Willow** (chosen by the founder). Trademark/domain not yet checked.
- Look and feel: **Kinetic** (chosen from 4 prototypes: off-white #f4f1ea, ink #0d0d0d, electric blue #2f5bff, hot orange #ff5a1f; fonts Anton / Archivo / Space Mono; sharp corners; scrolling ticker). Tokens in `app/globals.css`, primitives in `components/ui/`, ticker in `components/ticker.tsx`. Use class `font-display` for big numbers. Other directions (Aurora dark, Zinc clean, Clay warm) live on the design canvas if we revisit. Don't run `next build` while `npm run dev` is running (they share .next and the dev styles go stale).
- Product name is now applied in the UI (Willow).

## Status
- [x] a. Setup + auth
- [x] b. Student roster
- [x] c. Video upload
- [~] d. Analysis pipeline built; metric accuracy unvalidated on good footage
- [x] e. Per-video results: score breakdown, coach overrides (`score_overrides`, `analyses.coach_overall`), reviewed flag, notes - [x] f. Student dashboard (trend chart, per-skill latest/previous/best, personal best)
- [x] g. Roster overview (needs attention / top improvers), notes, demo data (`app/actions/demo.ts`, 'Load demo data' button)
- [x] Skeleton overlay on the video page (`components/skeleton-video.tsx`; keypoints JSON sits beside the video in the private bucket; frames store camera offsets so the outline lines up even when the camera moved). Videos analysed before this change draw without the offset.
- [~] Athlete side step 1 (roles + database rules): `supabase/athlete-side.sql` (invites table, athlete read/upload rules, coach-only fields protected by a trigger, storage rules, `get_invite_info`/`accept_invite` functions) + `supabase/tests/athlete-privacy-test.sql` (rolls back; every row must say PASS). App: `getRole()` in `lib/supabase/server.ts`, coach layout redirects athletes to `/me` (placeholder page). Athlete analysis scores must be written server-side with the service-role key (athletes have NO write access to `analyses`): add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` before the athlete upload step.
- Athlete progress chart requirement (founder): athletes see a Strava-style progress view: weekly trend chart of overall score, per-skill trends, streak calendar, personal-best badges, this-week-vs-last-week summary. Reuse `lib/progress.ts` (`summarize`, PB logic) and `components/trend-chart.tsx`. Prototype the screen in Kinetic style before building.
- [x] DB rules + privacy test passed (founder ran both in Supabase, all PASS).
- [x] Athlete steps 2-3 verified by founder (invite, sign-up, athlete home, upload, note sharing all worked). Athlete ANALYSIS still untested until the secret key is saved.
- [~] Athlete side step 3: athlete home `/me`, `/me/upload`, `/me/videos/[id]` (read-only scores, coach overrides win, shared coach notes), coach can share/hide notes per athlete. `/api/analyze` saves athlete scores with the service-role client (`lib/supabase/admin.ts`, needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; secret, server-only). KNOWN LIMIT: keypoints come from the browser, so a technical athlete could fabricate keypoints and get a higher score; fix later by re-analysing server-side or flagging coach-unreviewed athlete scores.
- [~] Athlete side step 2 (invite flow) coded: coach 'Athlete access' card on the student page (`components/invite-athlete.tsx`, `app/actions/invites.ts`), public `/invite/[token]` page (`components/join-form.tsx`), proxy treats `/invite/*` as public. Invite is bound to one email, expires in 14 days; acceptance is enforced by the `accept_invite` database function.
- [~] Athlete step 4: `/me/progress` (Strava-style: week-vs-last card, trend chart, 8-week streak calendar, personal bests, skill sparklines) in `app/me/progress/page.tsx` with maths in `lib/athlete-progress.ts` (unit-checked on sample data). Not built: activity-feed cards on `/me` (design on canvas), push/reminders.
- Deploy plan: see `DEPLOY.md`. Production build verified locally; `/lab` and `/api/dev/feedback` redirect to login in production.
- [~] Athlete step 5 coded, needs founder to run `supabase/consent.sql` (then re-run the privacy test, now 55 checks): privacy notice at `/privacy`, consent gate in `app/me/layout.tsx` (athlete sees only a consent form until a parent/guardian, or the player if 18+, accepts; stored in `consents`), consent ENFORCED in database rules for uploads, coach sees consent status and can permanently delete a student incl. stored files. Notice text is a plain-English draft: get it reviewed by a lawyer for the founder's country before real students.
- [ ] Athlete step 5 (remaining): guardian consent for under-18s, privacy notice, security review before real children's data; deploy plan (Vercel project `hackathon`, GitHub repo tryout-evidence-cards)
