-- Willow athlete side, step 5: consent records. Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- Run AFTER supabase/schema.sql and supabase/athlete-side.sql.
--
-- Before an athlete can use the app, an adult (the athlete if 18+, otherwise a parent/guardian)
-- accepts the privacy notice. We keep who accepted, in what role, which version, and when.

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null unique references athletes(id) on delete cascade,
  user_id uuid not null references profiles(id),
  consenter_name text not null,
  consenter_role text not null check (consenter_role in ('self_adult', 'parent_guardian')),
  notice_version text not null,
  accepted_at timestamptz not null default now()
);
alter table consents enable row level security;

-- The athlete's login can record consent once for its own student record, and read it back.
drop policy if exists consents_athlete_select on consents;
create policy consents_athlete_select on consents for select using (user_id = auth.uid());
drop policy if exists consents_athlete_insert on consents;
create policy consents_athlete_insert on consents for insert
  with check (user_id = auth.uid() and is_athlete_user(athlete_id));

-- The coach can see whether consent has been given for their own students.
drop policy if exists consents_coach_select on consents;
create policy consents_coach_select on consents for select using (owns_athlete(athlete_id));
-- (nobody can edit or delete a consent record through the app; withdrawal is handled by the coach deleting the student)

-- ---- Enforce consent in the database, not just on screen ----
-- An athlete cannot add videos or files until consent exists for their student record.
create or replace function athlete_has_consent(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from consents c join athletes at on at.id = c.athlete_id
                 where c.athlete_id = a and at.user_id = auth.uid());
$$;

drop policy if exists videos_athlete_insert on videos;
create policy videos_athlete_insert on videos for insert
  with check (is_athlete_user(athlete_id) and uploaded_by = auth.uid() and athlete_has_consent(athlete_id));

create or replace function athlete_owns_consented_path(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select athlete_owns_path(path) and exists (
    select 1 from consents c join athletes a on a.id = c.athlete_id
    where a.user_id = auth.uid() and a.id::text = (storage.foldername(path))[2]);
$$;

drop policy if exists videos_obj_athlete_insert on storage.objects;
create policy videos_obj_athlete_insert on storage.objects for insert
  with check (bucket_id = 'videos' and athlete_owns_consented_path(name));
drop policy if exists videos_obj_athlete_update on storage.objects;
create policy videos_obj_athlete_update on storage.objects for update
  using (bucket_id = 'videos' and athlete_owns_consented_path(name))
  with check (bucket_id = 'videos' and athlete_owns_consented_path(name));
