-- Willow: students who sign up on their own, with no coach ("independent students").
-- Run AFTER schema.sql, athlete-side.sql and consent.sql. Safe to re-run.
--
-- Rules this adds (all enforced here in the database, not only on screen):
--  * Only people aged 18 or over can create their own student record. Under-18s must join through a coach.
--  * An independent student can only ever touch their own record, and can never attach themselves to a coach.
--  * At most 5 new clips per 24 hours for independent students.
--  * Their files live in their own private folder: <their user id>/<their student id>/...
--  * They can delete all their own data.

-- 1. A student record may now belong to nobody.
alter table athletes alter column coach_id drop not null;

-- One student record per login (keeps "my record" lookups unambiguous).
create unique index if not exists athletes_one_per_user on athletes(user_id) where user_id is not null;

-- 2. Policies on the student record itself.
drop policy if exists athletes_self_insert on athletes;
create policy athletes_self_insert on athletes for insert
  with check (
    user_id = auth.uid() and coach_id is null and is_minor = false
    and date_of_birth is not null and date_of_birth <= (current_date - interval '18 years')
    and coalesce((select role from profiles where id = auth.uid()), '') = 'athlete'
  );

drop policy if exists athletes_self_update on athletes;
create policy athletes_self_update on athletes for update
  using (user_id = auth.uid() and coach_id is null)
  with check (
    user_id = auth.uid() and coach_id is null and is_minor = false
    and date_of_birth is not null and date_of_birth <= (current_date - interval '18 years')
  );

drop policy if exists athletes_self_delete on athletes;
create policy athletes_self_delete on athletes for delete
  using (user_id = auth.uid() and coach_id is null);

-- 3. Storage folder: coach-managed -> <coach_id>/<athlete_id>/...   independent -> <user_id>/<athlete_id>/...
create or replace function athlete_owns_path(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from athletes a
    where a.user_id = auth.uid()
      and a.id::text = (storage.foldername(path))[2]
      and coalesce(a.coach_id, a.user_id)::text = (storage.foldername(path))[1]
  );
$$;

-- The coach's storage rule must apply to coaches only. Without this, an independent student's own
-- folder name would also match it and they would skip the consent and limit rules.
drop policy if exists videos_obj_rw on storage.objects;
create policy videos_obj_rw on storage.objects for all
  using (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from profiles where id = auth.uid() and role = 'coach')
  )
  with check (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from profiles where id = auth.uid() and role = 'coach')
  );

-- Independent students (only) may delete their own files.
drop policy if exists videos_obj_athlete_delete on storage.objects;
create policy videos_obj_athlete_delete on storage.objects for delete
  using (
    bucket_id = 'videos' and athlete_owns_path(name)
    and exists (select 1 from athletes a where a.user_id = auth.uid() and a.coach_id is null
                and a.id::text = (storage.foldername(name))[2])
  );

-- 4. Daily limit: independent students get 5 new clips per 24 hours. Coach-managed students are not limited here.
create or replace function athlete_within_daily_limit(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select coach_id is not null from athletes where id = a and user_id = auth.uid()), false)
      or (select count(*) from videos where athlete_id = a and created_at > now() - interval '24 hours') < 5;
$$;

drop policy if exists videos_athlete_insert on videos;
create policy videos_athlete_insert on videos for insert
  with check (
    is_athlete_user(athlete_id) and uploaded_by = auth.uid()
    and athlete_has_consent(athlete_id) and athlete_within_daily_limit(athlete_id)
  );

-- 5. A login that already has a student record cannot also accept a coach invite (one record per login).
create or replace function accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  uid uuid := auth.uid();
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select * into inv from invites where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'This invite is invalid or has expired'; end if;
  if lower(inv.email) <> em then raise exception 'This invite was sent to a different email address'; end if;
  if coalesce((select role from profiles where id = uid), '') <> 'athlete' then
    raise exception 'Coach accounts cannot accept athlete invites';
  end if;
  if exists (select 1 from athletes where user_id = uid) then
    raise exception 'This login already has a Willow student profile, so it cannot join a coach';
  end if;
  update athletes set user_id = uid where id = inv.athlete_id and user_id is null;
  if not found then raise exception 'This student has already joined'; end if;
  update invites set accepted_at = now() where id = inv.id;
  return inv.athlete_id;
end $$;

revoke all on function accept_invite(text) from public;
grant execute on function accept_invite(text) to authenticated;
