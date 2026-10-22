# Deploying Willow to Vercel

Target: the existing Vercel project `hackathon` (https://hackathon-byob3.vercel.app), connected to GitHub repo `maitree27/tryout-evidence-cards`. Deploying replaces the old soccer app ("Tryout Evidence Cards") on that link.

## Before you start
- [ ] `git tag soccer-app-v1 fd19a41` (keeps the old app recoverable; `fd19a41` is its last commit)
- [ ] `npm run build` passes locally (stop `npm run dev` first; they share `.next`). Passed on 2026-10-22.
- [ ] `supabase/consent.sql` run, and the privacy test (55 checks) all PASS
- [ ] Privacy notice reviewed by a lawyer for your country (draft at /privacy)
- [ ] Athlete analysis tested locally with `SUPABASE_SERVICE_ROLE_KEY` saved (not yet).

## Vercel -> Project -> Settings -> Environment Variables (Production)
| Name | Value | Secret? |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | same as .env.local | no |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | same as .env.local | no |
| SUPABASE_SERVICE_ROLE_KEY | your sb_secret_ key | YES, never `NEXT_PUBLIC_` |
| OPENAI_API_KEY | your OpenAI key | YES |
| OPENAI_MODEL | gpt-4o | no |

## Supabase -> Authentication -> URL Configuration
- Site URL: https://hackathon-byob3.vercel.app
- Redirect URLs: add https://hackathon-byob3.vercel.app/**
- Email confirmation: currently OFF (prototype). Turn ON before real users, and set up custom SMTP (Supabase's default sender allows only a few emails per hour).

## Ship
1. Merge `cricket-coach` into `main`, push. Vercel builds automatically (the `prebuild` script copies the pose-model engine into `public/mediapipe`).
2. Smoke test on the live link: sign up as a coach, add a student, upload a clip, Analyse, invite an athlete (private window), athlete uploads and analyses.
3. If anything is badly wrong: Vercel -> Deployments -> the previous deployment -> "Instant Rollback" (brings the soccer app back).

## Before real students use it
- [ ] Remove demo data (home page button) and test accounts.
- [ ] Privacy notice + guardian consent for under-18s (athlete step 5).
- [ ] Separate Supabase project for production (this one is shared with dev).
- [ ] Rate limits / cost cap on `/api/analyze` (calls OpenAI).
- [ ] Short security review (RLS tests in `supabase/tests/` re-run on the production project).
- [ ] Rotate the Supabase secret key if it was ever pasted anywhere other than `.env.local` / Vercel.
