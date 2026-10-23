-- Coach notes can be pinned to a moment in the video (seconds from the start).
-- Safe to run more than once. Run after schema.sql, athlete-side.sql, consent.sql, self-signup.sql.
alter table coach_notes add column if not exists at_s numeric check (at_s is null or (at_s >= 0 and at_s <= 600));
