-- Willow athlete side, step 1: roles + database rules. Paste this whole file into Supabase -> SQL Editor -> Run.
-- Run AFTER supabase/schema.sql. Safe to re-run.
--
-- What this adds:
--  * Athletes (invite-only) can READ their own student record, videos, analyses and coach scores.
--  * Athletes can UPLOAD videos to their own record, but cannot change the coach's review flag,
--    move a video to someone else, or write/forge analysis scores.
--  * Coaches decide which notes an athlete can see (default: none).
--  * Invites: a coach creates an invite for an email; only that email can accept it.

-- 1. Coach notes: private by default, coach can share individual notes with the athlete.
alter table coach_notes add column if not exists visible_to_athlete boolean not null default false;

-- 2. Invites
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  email text not null,
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_by uuid not null references profiles(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invites_athlete_idx on invites(athlete_id);
alter table invites enable row level security;

-- helper functions (security definer so policies don't recurse)
create or replace function is_athlete_user(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from athletes where id = a and user_id = auth.uid());
$$;
create or replace function is_athlete_video(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from videos vi join athletes a on a.id = vi.athlete_id
                 where vi.id = v and a.user_id = auth.uid());
$$;

-- 3. Policies for athletes (coach policies from schema.sql are untouched)
drop policy if exists invites_coach on invites;
create policy invites_coach on invites for all
  using (owns_athlete(athlete_id)) with check (owns_athlete(athlete_id) and created_by = auth.uid());

drop policy if exists athletes_self_select on athletes;
create policy athletes_self_select on athletes for select using (user_id = auth.uid());

drop policy if exists videos_athlete_select on videos;
create policy videos_athlete_select on videos for select using (is_athlete_user(athlete_id));
drop policy if exists videos_athlete_insert on videos;
create policy videos_athlete_insert on videos for insert
  with check (is_athlete_user(athlete_id) and uploaded_by = auth.uid());
drop policy if exists videos_athlete_update on videos;
create policy videos_athlete_update on videos for update
  using (is_athlete_user(athlete_id)) with check (is_athlete_user(athlete_id));

drop policy if exists analyses_athlete_select on analyses;
create policy analyses_athlete_select on analyses for select using (is_athlete_video(video_id));

drop policy if exists overrides_athlete_select on score_overrides;
create policy overrides_athlete_select on score_overrides for select using (is_athlete_video(video_id));

drop policy if exists notes_athlete_select on coach_notes;
create policy notes_athlete_select on coach_notes for select
  using (is_athlete_user(athlete_id) and visible_to_athlete);

-- Row policies can't limit WHICH columns change, so a trigger protects the coach-owned fields.
create or replace function videos_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or owns_athlete(old.athlete_id) then
    return new; -- server-side jobs and the owning coach: unrestricted
  end if;
  if new.athlete_id <> old.athlete_id or new.uploaded_by <> old.uploaded_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'athletes cannot change ownership or the coach review flag';
  end if;
  return new;
end $$;
drop trigger if exists videos_guard_trg on videos;
create trigger videos_guard_trg before update on videos for each row execute function videos_guard();

-- 4. Private video storage for athletes: path <coach_id>/<athlete_id>/<file>
--    An athlete may read/write only inside the folder of THEIR OWN athlete record.
create or replace function athlete_owns_path(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from athletes a
    where a.user_id = auth.uid()
      and a.id::text = (storage.foldername(path))[2]
      and a.coach_id::text = (storage.foldername(path))[1]
  );
$$;
drop policy if exists videos_obj_athlete_select on storage.objects;
create policy videos_obj_athlete_select on storage.objects for select
  using (bucket_id = 'videos' and athlete_owns_path(name));
drop policy if exists videos_obj_athlete_insert on storage.objects;
create policy videos_obj_athlete_insert on storage.objects for insert
  with check (bucket_id = 'videos' and athlete_owns_path(name));
drop policy if exists videos_obj_athlete_update on storage.objects;
create policy videos_obj_athlete_update on storage.objects for update
  using (bucket_id = 'videos' and athlete_owns_path(name))
  with check (bucket_id = 'videos' and athlete_owns_path(name));

-- 5. Invite functions. The athlete has no right to edit athletes/invites directly,
--    so these run with elevated rights but check everything themselves.
create or replace function get_invite_info(p_token text)
returns table (athlete_name text, coach_name text, valid boolean)
language sql stable security definer set search_path = public as $$
  select a.name, p.full_name,
         (i.accepted_at is null and i.expires_at > now() and a.user_id is null)
  from invites i
  join athletes a on a.id = i.athlete_id
  join profiles p on p.id = a.coach_id
  where i.token = p_token;
$$;

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
  update athletes set user_id = uid where id = inv.athlete_id and user_id is null;
  if not found then raise exception 'This student has already joined'; end if;
  update invites set accepted_at = now() where id = inv.id;
  return inv.athlete_id;
end $$;

revoke all on function get_invite_info(text) from public;
revoke all on function accept_invite(text) from public;
grant execute on function get_invite_info(text) to anon, authenticated;
grant execute on function accept_invite(text) to authenticated;
